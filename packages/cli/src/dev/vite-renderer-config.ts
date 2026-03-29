import { resolve } from "node:path";
import type { InlineConfig, Logger, Plugin, UserConfig } from "vite";
import { mergeConfig } from "vite";
import type { RendererViewDefinition } from "./views";

// ── Per-view renderer config (dev mode only) ────────────────────────────────

export interface SingleViewRendererConfigOptions {
    /** View definition (entry, root, user config). */
    view: RendererViewDefinition;
    /** Dedicated Vite cache dir for this view dev server. */
    cacheDir?: string;
    /** Dev server port for this view (Vite will auto-select if taken). */
    port?: number;
    /** Vite log level override. */
    logLevel?: "info" | "warn" | "error" | "silent";
    /** Whether to clear the screen on rebuild. */
    clearScreen?: boolean;
    /** Custom Vite logger for scoped dev output. */
    customLogger?: Logger;
}

/**
 * Create an isolated Vite dev-server config for a single view.
 *
 * The Vite root is set to the view's own directory, so imports resolve
 * relative to the view package (correct for both single-package and
 * monorepo layouts). The server serves index.html at "/".
 */
export function createSingleViewRendererConfig(opts: SingleViewRendererConfigOptions): InlineConfig {
    const { view } = opts;
    const input = { [view.id]: resolve(view.root, view.entry) };

    const config: InlineConfig = {
        configFile: false,
        // Use the view's own directory as the Vite root so that file paths
        // in index.html and imports resolve relative to the view package.
        root: view.root,
        customLogger: opts.customLogger,
        // Multiple isolated dev servers must not share a single optimize-deps cache.
        cacheDir: opts.cacheDir,
        envPrefix: ["RENDERER_VITE_", "VITE_"],
        server: {
            host: "127.0.0.1",
            port: opts.port ?? 5173,
            // Allow Vite to find the next free port if this one is taken.
            strictPort: false,
        },
        build: {
            rolldownOptions: { input },
        },
        logLevel: opts.logLevel ?? "info",
        clearScreen: opts.clearScreen,
    };

    if (view.userConfig) {
        const merged = mergeConfig(config, view.userConfig) as InlineConfig;
        merged.plugins = deduplicatePlugins(merged.plugins as Plugin[]);
        return merged;
    }

    return config;
}

// ── Multi-view renderer config (production build) ───────────────────────────

export interface RendererConfigOptions {
    /** Project root */
    root: string;
    /** View definitions loaded from scanned defineView(...) files */
    views: readonly RendererViewDefinition[];
    /** User Vite configs to merge (from defineView(...) exports) */
    userViteConfigs?: UserConfig[];
    /** Vite log level override */
    logLevel?: "info" | "warn" | "error" | "silent";
    /** Whether to clear the screen on rebuild */
    clearScreen?: boolean;
    /** Production build output directory — when set, produces a build instead of dev server config */
    outDir?: string;
    /** Minify output (default true when outDir is set) */
    minify?: boolean;
    /** Sourcemap mode (linked | inline | external | none) */
    sourcemap?: string;
    /** Custom Vite logger (for build-mode output) */
    customLogger?: Logger;
}

function resolveSourcemap(mode?: string): boolean | "inline" | "hidden" {
    if (!mode || mode === "linked" || mode === "external") return true;
    if (mode === "inline") return "inline";
    if (mode === "none") return false;
    return true;
}

export function createRendererConfig(opts: RendererConfigOptions): InlineConfig {
    // Build multi-page input from view definitions
    // Each view entry is relative to its __source directory
    const input: Record<string, string> = {};
    for (const view of opts.views) {
        input[view.id] = resolve(view.root, view.entry);
    }

    const isBuild = !!opts.outDir;

    const config: InlineConfig = {
        configFile: false,
        root: opts.root,
        customLogger: opts.customLogger,
        envPrefix: ["RENDERER_VITE_", "VITE_"],

        // Dev server config — omitted in build mode
        ...(!isBuild && {
            server: {
                host: "127.0.0.1",
                strictPort: false,
            },
        }),

        // Use relative base for file:// protocol compatibility in production
        ...(isBuild && { base: "./" }),

        build: {
            rolldownOptions: {
                input,
            },
            ...(isBuild && {
                outDir: opts.outDir,
                emptyOutDir: true,
                minify: opts.minify ?? true,
                sourcemap: resolveSourcemap(opts.sourcemap),
                reportCompressedSize: true,
                modulePreload: { polyfill: false },
            }),
        },

        logLevel: opts.logLevel ?? "info",
        clearScreen: opts.clearScreen,
    };

    // Merge all view vite configs, deduplicating plugins by name
    if (opts.userViteConfigs?.length) {
        let merged = config;
        for (const userConfig of opts.userViteConfigs) {
            merged = mergeConfig(merged, userConfig) as InlineConfig;
        }
        merged.plugins = deduplicatePlugins(merged.plugins as Plugin[]);
        return merged;
    }

    return config;
}

/**
 * Deduplicate plugins by name — keeps the first occurrence of each named plugin.
 * This allows multiple views to declare the same plugins (e.g. react()) without
 * causing duplicate injection errors when configs are merged.
 */
function deduplicatePlugins(plugins: Plugin[]): Plugin[] {
    if (!plugins) return [];

    const seen = new Set<string>();
    const result: Plugin[] = [];

    for (const plugin of plugins.flat(Infinity) as Plugin[]) {
        const name = plugin?.name;
        if (!name) {
            result.push(plugin);
            continue;
        }
        if (seen.has(name)) continue;
        seen.add(name);
        result.push(plugin);
    }

    return result;
}
