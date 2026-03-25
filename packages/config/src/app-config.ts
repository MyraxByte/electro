/**
 * Application-level configuration.
 *
 * Exported from `electro.config.ts` at the project root.
 * Consumed by the Electro CLI for build, dev, preview, and code generation.
 */
export interface AppConfig {
    /**
     * Workspace package name of the runtime package.
     *
     * @example "runtime"
     */
    readonly runtime: string;

    /**
     * Workspace package names of view packages.
     *
     * @example ["@views/main", "@views/settings"]
     */
    readonly views: readonly string[];
}
