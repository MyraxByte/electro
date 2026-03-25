import { mkdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { type PackageTypeTarget, generate, scan } from "@electro/codegen";
import { build as viteBuild, version as viteVersion } from "vite";
import { loadConfig } from "../dev/config-loader";
import { resolveExternals } from "../dev/externals";
import type { SessionMeta } from "../dev/logger";
import { buildScope, createBuildLogger, footer, logSession, setLogLevel, startTimer, step, stepFail } from "../dev/logger";
import type { NodeOutputFormat } from "../dev/node-format";
import { resolveNodeOutputFormat } from "../dev/node-format";
import { createBuildRuntimeViewRegistry } from "../dev/runtime-view-registry";
import { createNodeConfig } from "../dev/vite-node-config";
import { createRendererConfig } from "../dev/vite-renderer-config";
import type { CliViewDefinition, ElectroConfigLike, RendererViewDefinition } from "../dev/views";
import { getRendererViews, getViewRoot, resolveGeneratedPreloadEntry, resolveRendererViewEntry } from "../dev/views";
import { assetPlugin } from "../plugins/asset";
import { bytecodePlugin } from "../plugins/bytecode";
import { modulePathPlugin } from "../plugins/module-path";
import { runtimePackageAliasPlugin } from "../plugins/runtime-package-alias";
import { workerPlugin } from "../plugins/worker";
import { validateSourcemap, validateViews, validateViteVersion } from "../validate";

interface BuildOptions {
    config: string;
    outDir: string;
    sourcemap?: string;
    minify: boolean;
    logLevel?: "info" | "warn" | "error" | "silent";
    bytecode?: boolean;
}

export async function build(options: BuildOptions): Promise<void> {
    if (options.sourcemap) {
        validateSourcemap(options.sourcemap);
    }

    if (options.logLevel) {
        setLogLevel(options.logLevel);
    }

    const totalTimer = startTimer();

    // 1. Validate Vite version
    validateViteVersion(viteVersion);

    // 2. Load config
    const loaded = await loadConfig(options.config);
    const config = loaded.config;
    const root = loaded.root;
    const outDir = resolve(root, options.outDir);
    const codegenDir = resolve(root, ".electro");
    const nodeFormat = await resolveNodeOutputFormat(root);
    const srcDir = loaded.scanDir;
    const scanResult = await scan(srcDir);
    const views = loaded.views;
    validateViews(views);
    const rendererViews = getRendererViews(views);

    // 3. Print session banner
    const mainSourceDir = dirname(config.runtime.__source);
    const mainEntry = resolve(mainSourceDir, config.runtime.entry);

    const sessionMeta: SessionMeta = {
        root,
        runtime: mainEntry,
        preload: views.length > 0 ? resolve(codegenDir, "generated/preload") : null,
        mode: "build",
        views: rendererViews.map((view) => ({
            id: view.id,
            root: view.root,
            entry: resolveRendererViewEntry(view),
        })),
    };
    logSession(sessionMeta);

    // 4. Codegen → .electro/generated/
    const codegenTimer = startTimer();
    try {
        const packageTargets: PackageTypeTarget[] = views.map((view) => ({
            packageRoot: getViewRoot(view),
            viewId: view.id,
        }));

        const { files, envTypes, packageTypes } = generate({
            scanResult,
            views,
            outputDir: codegenDir,
            srcDir,
            packageTargets,
        });

        await removeStaleCodegenArtifacts(codegenDir);
        await mkdir(codegenDir, { recursive: true });
        for (const file of files) {
            const filePath = resolve(codegenDir, file.path);
            await mkdir(dirname(filePath), { recursive: true });
            await writeFile(filePath, file.content);
        }

        const envTypesPath = resolve(srcDir, envTypes.path);
        await mkdir(dirname(envTypesPath), { recursive: true });
        await writeFileIfChanged(envTypesPath, envTypes.content);

        for (const pkg of packageTypes) {
            const packageEnvPath = join(pkg.packageRoot, pkg.path);
            await mkdir(dirname(packageEnvPath), { recursive: true });
            await writeFileIfChanged(packageEnvPath, pkg.content);
        }

        step("codegen", codegenTimer());
    } catch (err) {
        stepFail("codegen", err instanceof Error ? err.message : String(err));
        process.exit(1);
    }

    // 5. Resolve externals
    const resolvedExternals = await resolveExternals(root);
    const externals = resolvedExternals.externals;
    const cjsInteropDeps = resolvedExternals.cjsInteropDeps;

    // Build logger — suppresses Vite header, rebrands [vite] → [electro]
    const logger = createBuildLogger();

    // 6. Build main
    try {
        buildScope("main");
        await buildMain({
            config,
            root,
            outDir,
            rendererViews,
            externals,
            sourcemap: options.sourcemap,
            logger,
            bytecode: options.bytecode,
            format: nodeFormat,
            cjsInteropDeps,
        });
    } catch (err) {
        stepFail("main", err instanceof Error ? err.message : String(err));
        process.exit(1);
    }

    // 7. Build preload
    if (views.length > 0) {
        try {
            buildScope("preload");
            await buildPreload({
                config,
                views,
                root,
                outDir,
                codegenDir,
                externals,
                sourcemap: options.sourcemap,
                logger,
                bytecode: options.bytecode,
                format: nodeFormat,
                cjsInteropDeps,
            });
        } catch (err) {
            stepFail("preload", err instanceof Error ? err.message : String(err));
            process.exit(1);
        }
    }

    // 8. Build renderer
    if (rendererViews.length > 0) {
        try {
            buildScope("renderer");

            const userViteConfigs = rendererViews.map((view) => view.userConfig).filter((value): value is NonNullable<typeof value> => value !== undefined);

            const rendererConfig = createRendererConfig({
                root,
                views: rendererViews,
                userViteConfigs: userViteConfigs.length > 0 ? userViteConfigs : undefined,
                logLevel: "info",
                customLogger: logger,
                outDir: resolve(outDir, "renderer"),
                minify: options.minify,
                sourcemap: options.sourcemap,
            });

            await viteBuild(rendererConfig);

            // Flatten output: src/views/main/index.html → main/index.html
            await flattenRendererOutput(resolve(outDir, "renderer"), rendererViews, root);
        } catch (err) {
            stepFail("renderer", err instanceof Error ? err.message : String(err));
            process.exit(1);
        }
    }

    // 9. Footer with total time
    footer(`Built in ${totalTimer()}`, outDir);
}

// ── Internal build helpers ──────────────────────────────────────────

interface MainBuildArgs {
    config: ElectroConfigLike;
    root: string;
    outDir: string;
    rendererViews: readonly RendererViewDefinition[];
    externals: (string | RegExp)[];
    sourcemap?: string;
    logger: import("vite").Logger;
    bytecode?: boolean;
    format: NodeOutputFormat;
    cjsInteropDeps: string[];
}

async function buildMain(args: MainBuildArgs): Promise<void> {
    const runtimeEntry = args.config.runtime.entry;
    const sourceDir = dirname(args.config.runtime.__source);
    const entry = resolve(sourceDir, runtimeEntry);

    const viewRegistry = createBuildRuntimeViewRegistry(args.outDir, args.rendererViews);

    const mainConfig = createNodeConfig({
        scope: "main",
        root: args.root,
        entry,
        externals: args.externals,
        outDir: resolve(args.outDir, "main"),
        watch: false,
        plugins: [assetPlugin(), workerPlugin(), modulePathPlugin(), ...(args.bytecode ? [bytecodePlugin()] : [])],
        userViteConfig: args.config.runtime.userConfig,
        sourcemap: args.sourcemap,
        customLogger: args.logger,
        logLevel: "info",
        format: args.bytecode ? "cjs" : args.format,
        cjsInteropDeps: args.cjsInteropDeps,
        define: {
            __ELECTRO_VIEW_REGISTRY__: JSON.stringify(viewRegistry),
        },
    });

    await viteBuild(mainConfig);
}

interface PreloadBuildArgs {
    config: ElectroConfigLike;
    views: readonly CliViewDefinition[];
    root: string;
    outDir: string;
    codegenDir: string;
    externals: (string | RegExp)[];
    sourcemap?: string;
    logger: import("vite").Logger;
    bytecode?: boolean;
    format: NodeOutputFormat;
    cjsInteropDeps: string[];
}

async function buildPreload(args: PreloadBuildArgs): Promise<void> {
    const preloadOutDir = resolve(args.outDir, "preload");
    for (const [index, view] of args.views.entries()) {
        const entry = resolveGeneratedPreloadEntry(args.codegenDir, view);
        const config = createNodeConfig({
            scope: "preload",
            root: args.root,
            entry,
            externals: args.externals,
            outDir: preloadOutDir,
            watch: false,
            plugins: [runtimePackageAliasPlugin(args.config.runtime.__source), assetPlugin(), workerPlugin(), modulePathPlugin(), ...(args.bytecode ? [bytecodePlugin()] : [])],
            sourcemap: args.sourcemap,
            customLogger: args.logger,
            logLevel: "info",
            // Sandboxed preload should be emitted as CJS for stable execution.
            format: "cjs",
            cjsInteropDeps: args.cjsInteropDeps,
        });

        if (config.build) {
            const existingOutput = config.build.rolldownOptions?.output;
            config.build.emptyOutDir = index === 0;
            config.build.rolldownOptions = {
                ...config.build.rolldownOptions,
                output: Array.isArray(existingOutput)
                    ? existingOutput.map((output) => ({ ...output, entryFileNames: `${view.id}.cjs` }))
                    : {
                          ...existingOutput,
                          entryFileNames: `${view.id}.cjs`,
                      },
            };
        }

        await viteBuild(config);
    }
}

// ── Renderer output flattening ──────────────────────────────────────

/**
 * Flatten renderer HTML output from source-relative paths
 * (e.g., `src/views/main/index.html`) to `{id}/index.html`.
 * Adjusts relative asset references to match the new depth.
 */
async function flattenRendererOutput(rendererDir: string, views: readonly RendererViewDefinition[], root: string): Promise<void> {
    const dirsToClean = new Set<string>();

    for (const view of views) {
        const entryPath = resolveRendererViewEntry(view);
        const relPath = relative(root, entryPath);

        const oldHtmlPath = resolve(rendererDir, relPath);
        const newHtmlPath = resolve(rendererDir, view.id, "index.html");

        if (oldHtmlPath === newHtmlPath) continue;

        // Read HTML and adjust relative asset paths
        let html = await readFile(oldHtmlPath, "utf-8");
        const oldDepth = relPath.split("/").length - 1;
        const newDepth = view.id.split("/").length;
        const depthDiff = oldDepth - newDepth;

        if (depthDiff > 0) {
            html = html.replace(/(["'(])((?:\.\.\/)+)/g, (_, prefix: string, dots: string) => {
                const levels = (dots.match(/\.\.\//g) || []).length;
                const adjusted = Math.max(0, levels - depthDiff);
                return prefix + (adjusted > 0 ? "../".repeat(adjusted) : "./");
            });
        }

        await mkdir(dirname(newHtmlPath), { recursive: true });
        await writeFile(newHtmlPath, html);
        await unlink(oldHtmlPath);

        const [sourceTopDir] = relPath.split("/");
        const [outputTopDir] = view.id.split("/");
        if (sourceTopDir !== outputTopDir) {
            if (sourceTopDir) {
                dirsToClean.add(resolve(rendererDir, sourceTopDir));
            }
        }
    }

    for (const dir of dirsToClean) {
        await rm(dir, { recursive: true, force: true });
    }
}

async function writeFileIfChanged(filePath: string, content: string): Promise<void> {
    try {
        const prev = await readFile(filePath, "utf-8");
        if (prev === content) return;
    } catch {
        // File does not exist yet.
    }

    await writeFile(filePath, content);
}

async function removeStaleCodegenArtifacts(outputDir: string): Promise<void> {
    await rm(resolve(outputDir, "generated/views"), { recursive: true, force: true });
    await rm(resolve(outputDir, "generated/renderer-env.d.ts"), { force: true });
}
