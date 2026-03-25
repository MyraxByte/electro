import { spawn } from "node:child_process";
import { rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import MagicString from "magic-string";
import type { Logger, Plugin } from "vite";
import { findElectronBin } from "../dev/electron-launcher";

const BYTECODE_LOADER_FILE = "bytecode-loader.cjs";

export interface BytecodeOptions {
    /** Only compile chunks matching these names. Empty = compile all entry chunks. */
    chunkAlias?: string[];
    /** Keep original JS source alongside compiled .jsc for debugging. */
    keepSource?: boolean;
    /** String literals to obfuscate via String.fromCharCode before compilation. */
    protectedStrings?: string[];
}

/**
 * CJS module that registers `.jsc` file extension handler.
 * Loaded at runtime via createRequire before bytecode modules are required.
 */
const BYTECODE_LOADER_CODE = [
    `"use strict";`,
    `const fs = require("fs");`,
    `const path = require("path");`,
    `const vm = require("vm");`,
    `const v8 = require("v8");`,
    `const Module = require("module");`,
    ``,
    `v8.setFlagsFromString("--no-lazy");`,
    `v8.setFlagsFromString("--no-flush-bytecode");`,
    ``,
    `const FLAG_HASH_OFFSET = 12;`,
    `const SOURCE_HASH_OFFSET = 8;`,
    ``,
    `let dummyBytecode;`,
    `function fixFlagHash(buffer) {`,
    `  if (!dummyBytecode) {`,
    `    dummyBytecode = new vm.Script("", { produceCachedData: true }).createCachedData();`,
    `  }`,
    `  dummyBytecode.copy(buffer, FLAG_HASH_OFFSET, FLAG_HASH_OFFSET, FLAG_HASH_OFFSET + 4);`,
    `}`,
    ``,
    `Module._extensions[".jsc"] = function(module, filename) {`,
    `  const bytecode = fs.readFileSync(filename);`,
    `  fixFlagHash(bytecode);`,
    `  const sourceLength = bytecode.readUInt32LE(SOURCE_HASH_OFFSET);`,
    `  const dummyCode = sourceLength > 1 ? '"' + "\\u200b".repeat(sourceLength - 2) + '"' : "";`,
    `  const script = new vm.Script(dummyCode, { filename, cachedData: bytecode });`,
    `  if (script.cachedDataRejected) {`,
    `    throw new Error("Bytecode cache rejected (V8 version mismatch?): " + filename);`,
    `  }`,
    `  const wrapper = script.runInThisContext({ filename });`,
    `  const dir = path.dirname(filename);`,
    `  wrapper.apply(module.exports, [module.exports, module.require.bind(module), module, filename, dir]);`,
    `};`,
    ``,
].join("\n");

/**
 * Script executed inside Electron (ELECTRON_RUN_AS_NODE=1) to compile JS to V8 bytecode.
 * Reads CJS code from stdin, writes bytecode buffer to stdout.
 */
const COMPILER_SCRIPT = [
    `"use strict";`,
    `const vm = require("vm");`,
    `const v8 = require("v8");`,
    `const Module = require("module");`,
    ``,
    `v8.setFlagsFromString("--no-lazy");`,
    `v8.setFlagsFromString("--no-flush-bytecode");`,
    ``,
    `let code = "";`,
    `process.stdin.setEncoding("utf-8");`,
    `process.stdin.on("data", chunk => { code += chunk; });`,
    `process.stdin.on("end", () => {`,
    `  const wrapped = Module.wrap(code);`,
    `  const script = new vm.Script(wrapped, { produceCachedData: true });`,
    `  const bytecode = script.createCachedData();`,
    `  process.stdout.write(bytecode);`,
    `});`,
].join("\n");

/**
 * Compile Node scope output to V8 bytecode for source code protection.
 *
 * Architecture:
 * 1. Vite/Rolldown outputs CJS chunks directly (format forced by build config)
 * 2. CJS code → V8 bytecode (via Electron subprocess)
 * 3. Entry .cjs → thin CJS loader stub that requires the .jsc bytecode
 * 4. bytecode-loader.cjs → registers Module._extensions[".jsc"]
 *
 * Only active in production mode. Not applicable to renderer scope.
 */
export function bytecodePlugin(options: BytecodeOptions = {}): Plugin {
    const { chunkAlias = [], keepSource = false, protectedStrings = [] } = options;
    const compileAll = chunkAlias.length === 0;
    const protectedSet = new Set(protectedStrings);

    let logger: Logger;
    let isProduction = false;
    let projectRoot = "";

    function shouldCompile(chunkName: string): boolean {
        return compileAll || chunkAlias.includes(chunkName);
    }

    return {
        name: "electro:bytecode",
        apply: "build",
        enforce: "post",

        configResolved(config): void {
            logger = config.logger;
            isProduction = config.isProduction;
            projectRoot = config.root;
        },

        renderChunk(code, chunk, opts) {
            if (!isProduction || !shouldCompile(chunk.name) || protectedSet.size === 0) return null;

            const s = obfuscateStrings(code, protectedSet);
            if (!s) return null;

            const sourcemap = typeof opts === "object" && "sourcemap" in opts ? opts.sourcemap : false;
            return {
                code: s.toString(),
                map: sourcemap ? s.generateMap({ hires: "boundary" }) : undefined,
            };
        },

        async generateBundle(_outputOptions, output): Promise<void> {
            if (!isProduction) return;

            // Resolve Electron binary (walk up to monorepo root if needed)
            let electronPath: string | undefined;
            try {
                electronPath = await findElectronBin(projectRoot);
            } catch {
                try {
                    electronPath = await findElectronBin(join(projectRoot, "../.."));
                } catch {
                    // not found
                }
            }

            if (!electronPath) {
                logger.warn("[electro:bytecode] Electron binary not found — skipping bytecode compilation");
                return;
            }

            // Write compiler script to temp dir
            const compilerPath = join(tmpdir(), `electro-bc-compiler-${process.pid}.cjs`);
            await writeFile(compilerPath, COMPILER_SCRIPT);

            const chunks: Array<{ fileName: string; name: string; code: string; exports: string[]; isEntry: boolean }> = [];
            for (const item of Object.values(output)) {
                if (item.type === "chunk" && item.isEntry && shouldCompile(item.name)) {
                    chunks.push(item as (typeof chunks)[number]);
                }
            }

            if (chunks.length === 0) {
                await cleanup(compilerPath);
                return;
            }

            let compiledCount = 0;

            for (const chunk of chunks) {
                try {
                    // 1. Compile CJS → V8 bytecode (Vite already outputs CJS)
                    const bytecode = await compileToBytecode(chunk.code, electronPath, compilerPath);

                    // 2. Emit .jsc bytecode file
                    const jscFileName = `${chunk.fileName}c`;
                    this.emitFile({ type: "asset", fileName: jscFileName, source: bytecode });

                    // 3. Optionally keep original source for debugging
                    if (keepSource) {
                        this.emitFile({ type: "asset", fileName: `_${chunk.fileName}`, source: chunk.code });
                    }

                    // 4. Replace entry code with CJS loader stub
                    const loaderRel = relativeChunkPath(BYTECODE_LOADER_FILE, chunk.fileName);
                    const jscRel = relativeChunkPath(jscFileName, chunk.fileName);
                    chunk.code = generateLoaderStub(loaderRel, jscRel, chunk.exports);

                    compiledCount++;
                } catch (e) {
                    const message = e instanceof Error ? e.message : String(e);
                    logger.error(`[electro:bytecode] Failed to compile ${chunk.fileName}: ${message}`);
                }
            }

            // 6. Emit bytecode loader (once)
            if (compiledCount > 0) {
                const alreadyEmitted = Object.values(output).some((a) => a.type === "asset" && a.fileName === BYTECODE_LOADER_FILE);
                if (!alreadyEmitted) {
                    this.emitFile({ type: "asset", fileName: BYTECODE_LOADER_FILE, source: BYTECODE_LOADER_CODE });
                }
                logger.info(`\x1b[32m\u2713\x1b[0m ${compiledCount} chunk(s) compiled to bytecode`);
            }

            await cleanup(compilerPath);
        },
    };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compile CJS code to V8 bytecode via Electron subprocess. */
async function compileToBytecode(code: string, electronPath: string, compilerPath: string): Promise<Buffer> {
    const proc = spawn(electronPath, [compilerPath], {
        env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
        stdio: ["pipe", "pipe", "pipe"],
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    proc.stdout?.on("data", (chunk: Buffer | string) => {
        stdoutChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    proc.stderr?.on("data", (chunk: Buffer | string) => {
        stderrChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    const exitCode = await new Promise<number>((resolve, reject) => {
        proc.on("error", reject);
        proc.on("close", (code) => resolve(code ?? -1));
        proc.stdin?.end(code);
    });

    if (exitCode !== 0) {
        const stderrText = Buffer.concat(stderrChunks).toString("utf-8");
        throw new Error(`Bytecode compilation failed (exit ${exitCode}): ${stderrText}`);
    }

    const buf = Buffer.concat(stdoutChunks);
    if (buf.length === 0) {
        throw new Error("Bytecode compilation returned empty buffer");
    }

    return buf;
}

/** Generate CJS entry stub that loads bytecode. */
function generateLoaderStub(loaderPath: string, jscPath: string): string {
    const lines = [`"use strict";`, `require(${JSON.stringify(loaderPath)});`, `const __mod = require(${JSON.stringify(jscPath)});`, `module.exports = __mod;`];

    return `${lines.join("\n")}\n`;
}

/**
 * Obfuscate specific string literals via String.fromCharCode.
 *
 * Context-aware: skips strings that appear in unsafe positions:
 * - import/export specifiers: `import "pkg"`, `from "pkg"`
 * - require() arguments: `require("pkg")`
 * - computed member expressions: `obj["key"]`
 * - object literal keys: `{ "key": value }`
 */
function obfuscateStrings(code: string, strings: Set<string>): MagicString | null {
    if (strings.size === 0) return null;

    let s: MagicString | undefined;

    // Match quoted strings: captures the quote char, content, and position
    const stringRE = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g;
    let match: RegExpExecArray | null;

    match = stringRE.exec(code);
    while (match) {
        const value = match[1] ?? match[2];
        if (value && strings.has(value) && !isUnsafeContext(code, match.index, match[0].length)) {
            s ??= new MagicString(code);
            const charCodes = Array.from(value)
                .map((c) => c.charCodeAt(0))
                .join(",");
            s.overwrite(match.index, match.index + match[0].length, `String.fromCharCode(${charCodes})`, {
                contentOnly: true,
            });
        }
        match = stringRE.exec(code);
    }

    return s ?? null;
}

/** Check if a string literal at the given position is in an unsafe context for obfuscation. */
function isUnsafeContext(code: string, matchStart: number, matchLen: number): boolean {
    // Look at the code before the string (skip whitespace)
    const before = code.slice(Math.max(0, matchStart - 80), matchStart).trimEnd();

    // import "pkg" / import '...' from "pkg" / export ... from "pkg"
    if (/\bimport\s*$/.test(before) || /\bfrom\s*$/.test(before)) return true;

    // require("pkg")
    if (/\brequire\s*\(\s*$/.test(before)) return true;

    // Computed member: obj["key"] — preceding `[` (possibly with whitespace)
    if (before.endsWith("[")) return true;

    // Look at code after the string
    const after = code.slice(matchStart + matchLen, matchStart + matchLen + 20).trimStart();

    // Object key: "key": value — string followed by `:`
    if (after.startsWith(":")) {
        // But not ternary — check if before looks like `?` or start of object/argument
        if (!before.endsWith("?")) return true;
    }

    return false;
}

/** Compute relative path from `from` file to `target` file. */
function relativeChunkPath(target: string, from: string): string {
    const fromDir = dirname(from);
    let rel = relative(fromDir, target);
    if (!rel.startsWith(".")) rel = `./${rel}`;
    return rel;
}

/** Silent cleanup of temp files. */
async function cleanup(filePath: string): Promise<void> {
    try {
        await rm(filePath, { force: true });
    } catch {}
}
