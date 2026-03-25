import type { UserConfig as ViteUserConfig } from "vite";

/**
 * Runtime build configuration.
 *
 * Exported from `runtime.config.ts` inside the runtime package.
 * Extends Vite's `UserConfig` (minus fields Electro manages) with
 * the Electron main-process–specific `entry` field.
 *
 * Users have full access to: `resolve`, `plugins`, `define`,
 * `esbuild`, `ssr`, `css`, `assetsInclude`, `worker`, etc.
 *
 * @example
 * ```ts
 * // runtime/runtime.config.ts
 * import { defineRuntimeConfig } from "@electro/config";
 * import { resolve } from "node:path";
 *
 * export default defineRuntimeConfig({
 *     entry: "./src/main.ts",
 *     resolve: {
 *         alias: { "@": resolve(import.meta.dirname, "./") },
 *     },
 *     ssr: {
 *         noExternal: ["better-sqlite3"],
 *     },
 * });
 * ```
 */
export interface RuntimeConfig extends ViteUserConfig {
    /**
     * Entry point for the Electron main process.
     * Relative to the runtime package root.
     *
     * @example "./src/main.ts"
     */
    readonly entry: string;
}
