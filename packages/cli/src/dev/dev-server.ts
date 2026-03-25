import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import type { PackageTypeTarget, ScanResult } from "@electro/codegen";
import { generate, scan } from "@electro/codegen";
import type { Plugin, ViteDevServer } from "vite";
import { createServer, build as viteBuild, version as viteVersion } from "vite";
import { assetPlugin } from "../plugins/asset";
import { modulePathPlugin } from "../plugins/module-path";
import { runtimePackageAliasPlugin } from "../plugins/runtime-package-alias";
import { workerPlugin } from "../plugins/worker";
import { validateViteVersion } from "../validate";
import { loadConfig } from "./config-loader";
import type { ManagedProcess } from "./electron-launcher";
import { launchElectron } from "./electron-launcher";
import { resolveExternals } from "./externals";
import type { FooterEndpoint, SessionMeta } from "./logger";
import { footer, info, logSession, note, patchLogger, runtimeLog, setLogLevel, startTimer, step, stepFail } from "./logger";
import type { NodeOutputFormat } from "./node-format";
import { resolveMainEntryPath, resolveNodeOutputFormat } from "./node-format";
import { terminateManagedProcess } from "./process-shutdown";
import { createDevRuntimeViewRegistry } from "./runtime-view-registry";
import { createNodeConfig } from "./vite-node-config";
import { createSingleViewRendererConfig } from "./vite-renderer-config";
import type { CliViewDefinition, ElectroConfigLike, RendererViewDefinition } from "./views";
import { getRendererViews, getViewRoot, resolveGeneratedPreloadEntry, resolveRendererViewEntry } from "./views";
import { validateViews } from "../validate";

const MAIN_RESTART_DEBOUNCE_MS = 80;
const CONFIG_DEBOUNCE_MS = 300;
const MAIN_ENTRY_WAIT_TIMEOUT_MS = 10_000;
const MAIN_ENTRY_WAIT_INTERVAL_MS = 50;
const RENDERER_DEV_HOST = "127.0.0.1";

export interface DevServerOptions {
    configPath: string;
    logLevel?: "info" | "warn" | "error" | "silent";
    clearScreen?: boolean;
    rendererOnly?: boolean;
    sourcemap?: string;
    outDir?: string;
}

export class DevServer {
    /** One Vite dev server per view (keyed by viewId). */
    private rendererServers: Map<string, ViteDevServer> = new Map();
    private electronProcess: ManagedProcess | null = null;
    private config: ElectroConfigLike | null = null;
    private views: readonly CliViewDefinition[] = [];
    private rendererViews: readonly RendererViewDefinition[] = [];
    private root = "";
    private scanDir = "";
    private lastScanResult: ScanResult | null = null;
    private shuttingDown = false;
    private cleanedUp = false;
    private stopPromise: Promise<void> | null = null;

    // Restart state — mirrors deprecated CLI's robust restart logic
    private restartInFlight = false;
    private restartQueued = false;
    private restartQueuedFile: string | null = null;
    private mainRestartQueued = false;
    private mainRestartReason: string | null = null;
    private mainRestartFlushTimer: ReturnType<typeof setTimeout> | null = null;
    private mainRestartFlushInFlight = false;

    private mainWatch: { close(): void } | null = null;
    private preloadWatch: { close(): void } | null = null;
    private outputDir = "";
    private nodeFormat: NodeOutputFormat = "es";
    private mainInitialBuildPromise: Promise<void> | null = null;
    private resolveMainInitialBuild: (() => void) | null = null;
    private preloadInitialBuildPromise: Promise<void> | null = null;
    private resolvePreloadInitialBuild: (() => void) | null = null;
    private readonly logLevel?: "info" | "warn" | "error" | "silent";
    private readonly clearScreen?: boolean;
    private readonly rendererOnly: boolean;
    private readonly sourcemap?: string;
    private readonly outDirOverride?: string;

    // Config watcher state
    private configPaths: Set<string> = new Set();
    private configDebounce: ReturnType<typeof setTimeout> | null = null;
    private onRestart: (() => void) | null = null;

    /** Map of viewId → dev server URL ("http://127.0.0.1:{port}"). */
    private rendererUrls: Map<string, string> = new Map();
    /** Human-facing local URLs for logging/output. */
    private rendererDisplayUrls: Map<string, string> = new Map();
    /** Per-view Vite DevTools flags when enabled. */
    private rendererDevToolsEnabled: Set<string> = new Set();
    /** Ready footer endpoints. */
    private readyEndpoints: FooterEndpoint[] = [];

    constructor(
        private configPath: string,
        opts?: Omit<DevServerOptions, "configPath">,
    ) {
        this.logLevel = opts?.logLevel;
        this.clearScreen = opts?.clearScreen;
        this.rendererOnly = opts?.rendererOnly ?? false;
        this.sourcemap = opts?.sourcemap;
        this.outDirOverride = opts?.outDir;

        if (this.logLevel) {
            setLogLevel(this.logLevel);
        }
    }

    async start(): Promise<void> {
        this.cleanedUp = false;
        this.shuttingDown = false;
        this.stopPromise = null;
        this.readyEndpoints = [];

        validateViteVersion(viteVersion);

        const totalTimer = startTimer();

        // 1. Load config
        const loaded = await loadConfig(this.configPath);
        this.config = loaded.config;
        this.root = loaded.root;
        this.scanDir = loaded.scanDir;
        const initialScan = await scan(this.scanDir);
        this.lastScanResult = initialScan;
        this.views = loaded.views;
        validateViews(this.views);
        this.rendererViews = getRendererViews(this.views);
        this.outputDir = this.outDirOverride ? resolve(this.root, this.outDirOverride) : resolve(this.root, ".electro");
        this.nodeFormat = await resolveNodeOutputFormat(this.root);

        // Track config paths for watching
        this.configPaths = new Set(loaded.watchFiles);
        for (const view of this.views) {
            this.configPaths.add(view.__source);
        }

        // Print session banner
        const runtimeDir = dirname(this.config.runtime.__source);
        const runtimeEntry = resolve(runtimeDir, this.config.runtime.entry);

        const sessionMeta: SessionMeta = {
            root: this.root,
            runtime: runtimeEntry,
            preload: this.views.length > 0 ? resolve(this.outputDir, "generated/preload") : null,
            views: this.rendererViews.map((view) => ({
                id: view.id,
                root: view.root,
                entry: resolveRendererViewEntry(view),
            })),
        };
        logSession(sessionMeta);

        // 2. Run codegen
        const codegenTimer = startTimer();
        try {
            await this.runCodegen(this.outputDir, this.scanDir);
            step("codegen", codegenTimer());
        } catch (err) {
            stepFail("codegen", err instanceof Error ? err.message : String(err));
            throw err;
        }

        // 3. Start renderer dev server
        if (this.rendererViews.length > 0) {
            const rendererTimer = startTimer();
            try {
                await this.startRenderer();
                step("renderer", rendererTimer());
            } catch (err) {
                stepFail("renderer", err instanceof Error ? err.message : String(err));
                throw err;
            }
        }

        // Renderer-only mode — skip preload, main, and Electron
        if (this.rendererOnly) {
            note("Renderer-only mode — skipping main, preload, Electron");
            footer(`Ready in ${totalTimer()}`, this.readyEndpoints);
            this.logDevToolsHints();
            this.attachConfigWatcher();
            return;
        }

        // 4. Resolve externals
        const resolvedExternals = await resolveExternals(this.root);
        const externals = resolvedExternals.externals;
        const cjsInteropDeps = resolvedExternals.cjsInteropDeps;

        // 5. Build preload + main watchers in parallel.
        const preloadTimer = startTimer();
        const mainBuildTimer = startTimer();
        const [preloadResult, mainResult] = await Promise.allSettled([
            this.views.length > 0 ? this.buildPreload(externals, cjsInteropDeps) : Promise.resolve(),
            this.buildMain(externals, cjsInteropDeps),
        ]);

        if (this.views.length > 0) {
            if (preloadResult.status === "fulfilled") {
                step("preload", preloadTimer());
            } else {
                stepFail("preload", preloadResult.reason instanceof Error ? preloadResult.reason.message : String(preloadResult.reason));
            }
        }

        if (mainResult.status === "fulfilled") {
            step("main", mainBuildTimer());
        } else {
            stepFail("main", mainResult.reason instanceof Error ? mainResult.reason.message : String(mainResult.reason));
        }

        if (preloadResult.status === "rejected") {
            throw preloadResult.reason;
        }
        if (mainResult.status === "rejected") {
            throw mainResult.reason;
        }

        // 7. Launch Electron
        const electronTimer = startTimer();
        try {
            await this.waitForPreloadInitialBuild();
            await this.waitForMainInitialBuild();
            await this.attachElectronProcess();
            step("electron", electronTimer());
        } catch (err) {
            stepFail("electron", err instanceof Error ? err.message : String(err));
            throw err;
        }

        footer(`Ready in ${totalTimer()}`, this.readyEndpoints);
        this.logDevToolsHints();

        // 8. Watch config files
        this.attachConfigWatcher();
    }

    /** Register a callback for config-triggered restarts. */
    setOnRestart(fn: () => void): void {
        this.onRestart = fn;
    }

    /** Clean shutdown — idempotent, safe to call from any context. */
    async stop(): Promise<void> {
        if (this.stopPromise) {
            await this.stopPromise;
            return;
        }

        this.cleanedUp = true;
        this.shuttingDown = true;

        this.stopPromise = (async () => {
            // Clear config watcher state
            if (this.configDebounce) {
                clearTimeout(this.configDebounce);
                this.configDebounce = null;
            }
            // Unwatch config paths from all renderer servers
            for (const server of this.rendererServers.values()) {
                if (server.watcher) {
                    for (const configPath of this.configPaths) {
                        server.watcher.unwatch(configPath);
                    }
                }
            }
            this.configPaths.clear();

            if (this.electronProcess) {
                const proc = this.electronProcess;
                this.electronProcess = null; // mark stale before kill
                await this.terminateElectronProcess(proc);
            }

            this.mainWatch?.close();
            this.mainWatch = null;
            this.preloadWatch?.close();
            this.preloadWatch = null;
            this.resolveMainInitialBuild = null;
            this.mainInitialBuildPromise = null;
            this.resolvePreloadInitialBuild = null;
            this.preloadInitialBuildPromise = null;

            if (this.mainRestartFlushTimer) {
                clearTimeout(this.mainRestartFlushTimer);
                this.mainRestartFlushTimer = null;
            }

            if (this.rendererServers.size > 0) {
                const closePromises = [...this.rendererServers.values()].map((server) => server.close());
                this.rendererServers.clear();
                this.rendererUrls.clear();
                this.rendererDisplayUrls.clear();
                this.rendererDevToolsEnabled.clear();
                this.readyEndpoints = [];
                await Promise.allSettled(closePromises);
            }

        })();

        await this.stopPromise;
    }

    // ── Internal methods ────────────────────────────────────

    private async runCodegen(outputDir: string, srcDir: string, existingScan?: ScanResult): Promise<void> {
        const scanResult = existingScan ?? (await scan(srcDir));
        this.lastScanResult = scanResult;
        validateViews(this.views);
        this.rendererViews = getRendererViews(this.views);

        const packageTargets: PackageTypeTarget[] = this.views.map((view) => ({
            packageRoot: getViewRoot(view),
            viewId: view.id,
        }));

        const { files, envTypes, packageTypes } = generate({
            scanResult,
            views: this.views,
            outputDir,
            srcDir,
            packageTargets,
        });

        await removeStaleCodegenArtifacts(outputDir);
        await mkdir(outputDir, { recursive: true });

        for (const file of files) {
            const filePath = resolve(outputDir, file.path);
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
    }

    private async startRenderer(): Promise<void> {
        // Each view gets its own isolated Vite dev server, starting at port 5173.
        // Vite auto-selects the next free port if the requested one is taken.
        const basePort = 5173;
        const startedServers: ViteDevServer[] = [];

        try {
            const servers = await Promise.all(
                this.rendererViews.map(async (view, index) => {
                    const config = createSingleViewRendererConfig({
                        view,
                        cacheDir: resolve(this.root, "node_modules", ".vite", "electro", view.id),
                        port: basePort + index,
                        logLevel: this.logLevel,
                        clearScreen: this.clearScreen,
                    });

                    const server = await createServer(config);
                    startedServers.push(server);
                    patchLogger(server.config.logger, `renderer:${view.id}`);
                    await server.listen();

                    return {
                        viewId: view.id,
                        requestedPort: basePort + index,
                        server,
                    };
                }),
            );

            for (const { viewId, requestedPort, server } of servers) {
                const url = this.resolveRendererRuntimeUrl(server, requestedPort);
                const displayUrl = this.resolveRendererDisplayUrl(server, url);
                const devToolsEnabled = this.isRendererDevToolsEnabled(server);

                this.rendererServers.set(viewId, server);
                this.rendererUrls.set(viewId, url);
                this.rendererDisplayUrls.set(viewId, displayUrl);
                if (devToolsEnabled) {
                    this.rendererDevToolsEnabled.add(viewId);
                }
            }
        } catch (error) {
            await Promise.allSettled(startedServers.map((server) => server.close()));
            throw error;
        }

        this.readyEndpoints = this.collectReadyEndpoints();
    }

    private resolveRendererRuntimeUrl(server: ViteDevServer, fallbackPort: number): string {
        const addr = server.httpServer?.address();
        const port = typeof addr === "object" && addr ? addr.port : fallbackPort;
        return `http://${RENDERER_DEV_HOST}:${port}`;
    }

    private resolveRendererDisplayUrl(server: ViteDevServer, fallbackUrl: string): string {
        return server.resolvedUrls?.local[0] ?? fallbackUrl;
    }

    private isRendererDevToolsEnabled(server: ViteDevServer): boolean {
        const resolvedConfig = server.config as typeof server.config & {
            devtools?: { enabled?: boolean };
        };
        return !!resolvedConfig.devtools?.enabled;
    }

    private collectReadyEndpoints(): FooterEndpoint[] {
        const multipleViews = this.rendererViews.length > 1;
        const endpoints: FooterEndpoint[] = [];

        for (const view of this.rendererViews) {
            const rendererUrl = this.rendererDisplayUrls.get(view.id);
            if (rendererUrl) {
                endpoints.push({
                    label: multipleViews ? `renderer:${view.id}` : "renderer",
                    url: rendererUrl,
                });
            }
        }

        return endpoints;
    }

    private logDevToolsHints(): void {
        if (this.isRuntimeDevToolsEnabled()) {
            note("Vite config `devtools` is enabled for runtime, but this Vite version supports that flag only in build mode. `electro dev` will not expose a DevTools UI for main/preload.");
        }

        if (this.rendererDevToolsEnabled.size === 0) {
            return;
        }

        const multipleViews = this.rendererViews.length > 1;
        for (const view of this.rendererViews) {
            if (!this.rendererDevToolsEnabled.has(view.id)) continue;

            const label = multipleViews ? `renderer:${view.id}` : "renderer";
            note(`Vite config \`devtools\` is enabled for ${label}, but this Vite version supports that flag only in build mode. \`electro dev\` will not expose a DevTools UI for it.`);
        }
    }

    private isRuntimeDevToolsEnabled(): boolean {
        const runtimeConfig = this.config?.runtime.userConfig as { devtools?: { enabled?: boolean } } | undefined;
        return !!runtimeConfig?.devtools?.enabled;
    }

    private async buildPreload(externals: (string | RegExp)[], cjsInteropDeps: string[]): Promise<void> {
        const preloadOutDir = resolve(this.outputDir, "preload");
        this.preloadInitialBuildPromise = new Promise<void>((resolve) => {
            this.resolvePreloadInitialBuild = () => {
                resolve();
                this.resolvePreloadInitialBuild = null;
            };
        });

        let pendingInitialBuilds = this.views.length;
        const watchers: Array<{ close(): void }> = [];

        const markInitialBuildComplete = () => {
            pendingInitialBuilds -= 1;
            if (pendingInitialBuilds === 0) {
                this.resolvePreloadInitialBuild?.();
            }
        };

        for (const [index, view] of this.views.entries()) {
            const entry = resolveGeneratedPreloadEntry(this.outputDir, view);
            const config = createNodeConfig({
                scope: "preload",
                root: this.root,
                entry,
                externals,
                outDir: preloadOutDir,
                watch: true,
                plugins: [runtimePackageAliasPlugin(this.config!.runtime.__source), assetPlugin(), workerPlugin(), modulePathPlugin()],
                logLevel: this.logLevel,
                clearScreen: this.clearScreen,
                sourcemap: this.sourcemap,
                // Sandboxed preload cannot run ESM imports reliably; force CJS output.
                format: "cjs",
                cjsInteropDeps,
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

            let firstBuild = true;
            (config.plugins as Plugin[]).push({
                name: `electro:preload-watch:${view.id}`,
                apply: "build",
                watchChange: (id) => {
                    if (!firstBuild) {
                        const changed = relative(this.root, id);
                        runtimeLog("preload", "rebuild → page reload", changed);
                    }
                },
                closeBundle: () => {
                    if (firstBuild) {
                        firstBuild = false;
                        markInitialBuildComplete();
                        return;
                    }
                    // Send full-reload only to this view's Vite dev server
                    const viewServer = this.rendererServers.get(view.id);
                    if (viewServer) {
                        viewServer.ws.send({ type: "full-reload" });
                    }
                },
            });

            const watcher = await viteBuild(config);
            watchers.push(watcher as { close(): void });
        }

        this.preloadWatch = {
            close() {
                for (const watcher of watchers) {
                    watcher.close();
                }
            },
        };
    }

    private async buildMain(externals: (string | RegExp)[], cjsInteropDeps: string[]): Promise<void> {
        const runtimeEntry = this.config!.runtime.entry;
        const sourceDir = dirname(this.config!.runtime.__source);
        const entry = resolve(sourceDir, runtimeEntry);
        this.mainInitialBuildPromise = new Promise<void>((resolve) => {
            this.resolveMainInitialBuild = () => {
                resolve();
                this.resolveMainInitialBuild = null;
            };
        });

        const viewRegistry =
            this.rendererUrls.size > 0 && this.rendererViews.length > 0
                ? createDevRuntimeViewRegistry(this.outputDir, this.rendererUrls, this.rendererViews)
                : [];

        const mainConfig = createNodeConfig({
            scope: "main",
            root: this.root,
            entry,
            externals,
            outDir: resolve(this.outputDir, "main"),
            watch: true,
            plugins: [assetPlugin(), workerPlugin(), modulePathPlugin()],
            logLevel: this.logLevel,
            clearScreen: this.clearScreen,
            userViteConfig: this.config!.runtime.userConfig,
            sourcemap: this.sourcemap,
            format: this.nodeFormat,
            cjsInteropDeps,
            define: {
                __ELECTRO_VIEW_REGISTRY__: JSON.stringify(viewRegistry),
            },
        });

        let firstBuild = true;
        let changedFile: string | null = null;

        (mainConfig.plugins as Plugin[]).push({
            name: "electro:main-watch",
            apply: "build",
            watchChange: (id) => {
                changedFile = changedFile ?? id;
            },
            closeBundle: async () => {
                if (firstBuild) {
                    firstBuild = false;
                    changedFile = null;
                    this.resolveMainInitialBuild?.();
                    return;
                }

                const currentChanged = changedFile;
                changedFile = null;

                // Re-run codegen if scan result changed
                const newScan = await scan(this.scanDir);
                if (JSON.stringify(newScan) !== JSON.stringify(this.lastScanResult)) {
                    runtimeLog("main", "generated");
                    await this.runCodegen(this.outputDir, this.scanDir, newScan);
                }

                this.queueMainRestart(currentChanged);
            },
        });

        const watcher = await viteBuild(mainConfig);
        this.mainWatch = watcher as { close(): void };
    }

    // ── Electron process management ─────────────────────────

    /**
     * Primary startup synchronization for dev mode:
     * wait until the initial main watch build has completed.
     */
    private async waitForMainInitialBuild(): Promise<void> {
        if (!this.mainInitialBuildPromise) return;

        const timeout = sleep(MAIN_ENTRY_WAIT_TIMEOUT_MS).then(() => {
            throw new Error(`Main initial build did not finish in ${MAIN_ENTRY_WAIT_TIMEOUT_MS}ms.`);
        });

        const promise = this.mainInitialBuildPromise;
        this.mainInitialBuildPromise = null;
        await Promise.race([promise, timeout]);
    }

    /**
     * Wait until the initial preload watch build has completed.
     * Prevents launching Electron before `window.electro` bridge is injected.
     */
    private async waitForPreloadInitialBuild(): Promise<void> {
        if (!this.preloadInitialBuildPromise) return;

        const timeout = sleep(MAIN_ENTRY_WAIT_TIMEOUT_MS).then(() => {
            throw new Error(`Preload initial build did not finish in ${MAIN_ENTRY_WAIT_TIMEOUT_MS}ms.`);
        });

        const promise = this.preloadInitialBuildPromise;
        this.preloadInitialBuildPromise = null;
        await Promise.race([promise, timeout]);
    }

    private async attachElectronProcess(): Promise<void> {
        const mainEntry = await this.waitForMainEntry();
        const env: Record<string, string> = {
            ELECTRO_DEV: "true",
        };
        const runtimeRoot = dirname(this.config?.runtime.__source ?? this.root);
        const electronSearchRoots = [...new Set([this.root, runtimeRoot, ...this.views.map((view) => view.root)])];

        if (this.rendererUrls.size > 0) {
            // Set the first view's URL as the renderer base (backward compat)
            const firstViewId = this.rendererViews[0]?.id;
            if (firstViewId) {
                const firstUrl = this.rendererUrls.get(firstViewId);
                if (firstUrl) env.ELECTRO_RENDERER_BASE = firstUrl;
            }

            // Per-view URLs — each view's Vite dev server serves at its root
            for (const view of this.rendererViews) {
                const viewUrl = this.rendererUrls.get(view.id);
                if (viewUrl) {
                    env[`ELECTRO_DEV_URL_${view.id}`] = viewUrl;
                }
            }
        }

        const proc = await launchElectron({
            searchRoots: electronSearchRoots,
            cwd: this.root,
            entry: mainEntry,
            env,
        });
        this.electronProcess = proc;

        // Monitor exit — stale process guard: ignore if we already moved on
        void proc.exited.then(async (code) => {
            if (this.electronProcess !== proc) return;
            if (this.shuttingDown) return;

            if (code === 0) {
                runtimeLog("main", "exited");
            } else {
                runtimeLog("main", `crashed (exit ${code})`);
            }
            await this.stop();
            process.exit(code === 0 ? 0 : 1);
        });
    }

    /**
     * In watch mode, Vite can return the watcher before the first output file
     * is written. Wait for the built main entry to appear before spawning Electron.
     */
    private async waitForMainEntry(): Promise<string> {
        const mainOutDir = resolve(this.outputDir, "main");
        const deadline = Date.now() + MAIN_ENTRY_WAIT_TIMEOUT_MS;
        let lastError: unknown;

        while (Date.now() < deadline) {
            try {
                return await resolveMainEntryPath(mainOutDir);
            } catch (err) {
                lastError = err;
                await sleep(MAIN_ENTRY_WAIT_INTERVAL_MS);
            }
        }

        const detail = lastError instanceof Error ? ` Last error: ${lastError.message}` : "";
        throw new Error(`Main entry was not generated in time (${MAIN_ENTRY_WAIT_TIMEOUT_MS}ms).` + ` Checked in: ${mainOutDir}.${detail}`);
    }

    /**
     * Restart Electron — handles queued restarts if another rebuild
     * arrives while restart is in flight.
     */
    private async restartElectron(changedFile: string | null): Promise<void> {
        if (this.restartInFlight) {
            this.restartQueued = true;
            this.restartQueuedFile = changedFile ?? this.restartQueuedFile;
            return;
        }

        this.restartInFlight = true;
        let nextChanged: string | null = changedFile;

        do {
            this.restartQueued = false;
            const changed = nextChanged ? relative(this.root, nextChanged) : null;
            runtimeLog("main", "rebuild → restart", changed);
            nextChanged = null;

            if (this.electronProcess) {
                const prev = this.electronProcess;
                this.electronProcess = null; // mark stale before kill
                await this.terminateElectronProcess(prev);
            }

            await this.attachElectronProcess();

            if (this.restartQueued) {
                nextChanged = this.restartQueuedFile;
                this.restartQueuedFile = null;
            }
        } while (this.restartQueued);

        this.restartInFlight = false;
    }

    private async terminateElectronProcess(proc: ManagedProcess): Promise<void> {
        await terminateManagedProcess(proc, { mode: "fast" });
    }

    // ── Debounced restart scheduling ────────────────────────

    private queueMainRestart(changedFile: string | null): void {
        if (changedFile) {
            this.mainRestartReason = changedFile;
        } else if (!this.mainRestartReason) {
            this.mainRestartReason = changedFile;
        }
        this.mainRestartQueued = true;
        this.scheduleMainRestartFlush();
    }

    private scheduleMainRestartFlush(): void {
        if (this.mainRestartFlushTimer) clearTimeout(this.mainRestartFlushTimer);
        this.mainRestartFlushTimer = setTimeout(() => {
            this.mainRestartFlushTimer = null;
            void this.flushMainRestartQueue();
        }, MAIN_RESTART_DEBOUNCE_MS);
    }

    private async flushMainRestartQueue(): Promise<void> {
        if (this.mainRestartFlushInFlight || !this.mainRestartQueued) return;
        this.mainRestartFlushInFlight = true;

        try {
            const reason = this.mainRestartReason;
            this.mainRestartQueued = false;
            this.mainRestartReason = null;
            await this.restartElectron(reason);
        } finally {
            this.mainRestartFlushInFlight = false;
            if (this.mainRestartQueued && !this.mainRestartFlushTimer) {
                this.scheduleMainRestartFlush();
            }
        }
    }

    // ── Config file watcher ─────────────────────────────────

    private attachConfigWatcher(): void {
        // Use the first renderer server's Chokidar watcher for config file watching.
        // All servers share the same project files, so one watcher is sufficient.
        const firstServer = this.rendererServers.values().next().value as ViteDevServer | undefined;
        if (!firstServer?.watcher) return;

        const watcher = firstServer.watcher;

        for (const configPath of this.configPaths) {
            watcher.add(configPath);
        }

        watcher.on("change", (changedPath) => {
            if (!this.configPaths.has(changedPath)) return;
            if (this.shuttingDown) return;

            if (this.configDebounce) {
                clearTimeout(this.configDebounce);
            }

            this.configDebounce = setTimeout(() => {
                this.configDebounce = null;
                info("Config file changed, restarting...");
                void (async () => {
                    await this.stop();
                    this.onRestart?.();
                })();
            }, CONFIG_DEBOUNCE_MS);
        });
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
