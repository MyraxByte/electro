import type { UserConfig as ViteUserConfig } from "vite";

/**
 * View build configuration.
 *
 * Exported from `view.config.ts` inside each view package.
 * Extends Vite's `UserConfig` (minus fields Electro manages) with
 * view-specific fields.
 *
 * Users have full access to: `resolve`, `plugins`, `define`,
 * `esbuild`, `css`, `assetsInclude`, `optimizeDeps`, `worker`, etc.
 *
 * @example
 * ```ts
 * // renderer/views/main/view.config.ts
 * import { defineViewConfig } from "@electrojs/config";
 * import { resolve } from "node:path";
 * import react from "@vitejs/plugin-react";
 *
 * export default defineViewConfig({
 *     viewId: "main",
 *     entry: "./index.html",
 *     plugins: [react()],
 *     resolve: {
 *         alias: { "@": resolve(import.meta.dirname, "../../") },
 *     },
 * });
 * ```
 */
export interface ViewConfig extends ViteUserConfig {
    /**
     * The unique identifier of this view.
     * Must match the `id` of the corresponding runtime `@View` class
     * (derived from `resource: "view:<id>"`).
     *
     * @example "main"
     */
    readonly viewId: string;

    /**
     * Path to the HTML entry file for this view.
     * Relative to the view config file location.
     *
     * @example "./index.html"
     */
    readonly entry: string;
}
