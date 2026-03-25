import type { AppConfig } from "./app-config";
import type { RuntimeConfig } from "./runtime-config";
import type { ViewConfig } from "./view-config";

/**
 * Defines an application-level configuration with full type safety.
 *
 * Use in `electro.config.ts` at the project root.
 *
 * @example
 * ```ts
 * // electro.config.ts
 * import { defineElectroConfig } from "@electrojs/config";
 *
 * export default defineElectroConfig({
 *     runtime: "runtime",
 *     views: ["@views/main"],
 * });
 * ```
 */
export function defineElectroConfig(config: AppConfig): AppConfig {
    return config;
}

/**
 * Defines a runtime build configuration with full type safety.
 *
 * Use in `runtime.config.ts` inside the runtime package.
 *
 * @example
 * ```ts
 * // runtime/runtime.config.ts
 * import { defineRuntimeConfig } from "@electrojs/config";
 *
 * export default defineRuntimeConfig({
 *     entry: "./src/main.ts",
 *     ssr: { noExternal: ["better-sqlite3"] },
 * });
 * ```
 */
export function defineRuntimeConfig(config: RuntimeConfig): RuntimeConfig {
    return config;
}

/**
 * Defines a view build configuration with full type safety.
 *
 * Use in `view.config.ts` inside each view package.
 *
 * @example
 * ```ts
 * // renderer/views/main/view.config.ts
 * import { defineViewConfig } from "@electrojs/config";
 * import react from "@vitejs/plugin-react";
 *
 * export default defineViewConfig({
 *     viewId: "main",
 *     entry: "./index.html",
 *     plugins: [react()],
 * });
 * ```
 */
export function defineViewConfig(config: ViewConfig): ViewConfig {
    return config;
}
