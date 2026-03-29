import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createRuntimeDiagnosticsFormatter, type RuntimeDiagnosticsMode } from "./runtime-diagnostics";

async function fileExists(path: string): Promise<boolean> {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
}

/**
 * Find the Electron binary. Resolution order:
 * 1. ELECTRON_EXEC_PATH env var
 * 2. electron/path.txt (npm package convention) in any search root
 * 3. node_modules/.bin/electron symlink in any search root
 */
export async function findElectronBin(roots: readonly string[]): Promise<string> {
    // 1. Env var
    if (process.env.ELECTRON_EXEC_PATH) return process.env.ELECTRON_EXEC_PATH;

    for (const root of roots) {
        // 2. electron/path.txt
        try {
            const electronDir = resolve(root, "node_modules/electron");
            const pathTxtPath = resolve(electronDir, "path.txt");
            if (await fileExists(pathTxtPath)) {
                const binPath = (await readFile(pathTxtPath, "utf-8")).trim();
                const resolved = resolve(electronDir, "dist", binPath);
                if (await fileExists(resolved)) return resolved;
            }
        } catch {
            // fall through
        }

        // 3. Symlink
        const binSymlink = resolve(root, "node_modules/.bin/electron");
        if (await fileExists(binSymlink)) return binSymlink;
    }

    throw new Error("Could not find Electron binary. Install electron: npm add -D electron");
}

export interface ElectronLaunchOptions {
    /** Search roots used to resolve the Electron binary */
    searchRoots: readonly string[];
    /** Working directory for the Electron child process */
    cwd: string;
    /** Path to the built main entry (e.g. .electro/main/index.mjs or index.cjs) */
    entry: string;
    /** Environment variables to pass */
    env?: Record<string, string>;
}

export interface ManagedProcess {
    kill(signal?: NodeJS.Signals): void;
    exited: Promise<number | null>;
}

function resolveRuntimeDiagnosticsMode(env: NodeJS.ProcessEnv = process.env): RuntimeDiagnosticsMode {
    return env.ELECTRO_RUNTIME_LOGS === "raw" ? "raw" : "pretty";
}

function pipeWithColoring(stream: NodeJS.ReadableStream, target: NodeJS.WritableStream): void {
    let buffer = "";
    const formatter = createRuntimeDiagnosticsFormatter(resolveRuntimeDiagnosticsMode());
    stream.on("data", (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() ?? "";
        for (const line of lines) {
            for (const formattedLine of formatter.formatLine(line)) {
                target.write(`${formattedLine}\n`);
            }
        }
    });
    stream.on("end", () => {
        if (buffer) {
            for (const formattedLine of formatter.formatLine(buffer)) {
                target.write(`${formattedLine}\n`);
            }
        }
        for (const formattedLine of formatter.flush()) {
            target.write(`${formattedLine}\n`);
        }
    });
}

export async function launchElectron(opts: ElectronLaunchOptions): Promise<ManagedProcess> {
    const electronBin = await findElectronBin(opts.searchRoots);

    const proc = spawn(electronBin, [opts.entry], {
        cwd: opts.cwd,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, ...opts.env },
    });

    // Pipe stdout/stderr with diagnostic line coloring
    if (proc.stdout) pipeWithColoring(proc.stdout, process.stdout);
    if (proc.stderr) pipeWithColoring(proc.stderr, process.stderr);

    const exited = new Promise<number | null>((resolve) => {
        proc.on("exit", (code) => resolve(code));
        proc.on("error", () => resolve(null));
    });

    return {
        kill: (signal = "SIGTERM") => proc.kill(signal),
        exited,
    };
}
