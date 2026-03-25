import type { Plugin } from "vite";

interface ImportMetaPlugin extends Plugin {
    resolveImportMeta(property: string | null, context: { format: string }): string | null;
}

/**
 * Rewrites import.meta.* expressions for CommonJS output format.
 */
export function importMetaPlugin(): Plugin {
    const plugin: ImportMetaPlugin = {
        name: "electro:import-meta",
        apply: "build",
        enforce: "pre",
        resolveImportMeta(property, { format }): string | null {
            if (format !== "cjs") return null;

            if (property === "url") {
                return `require("node:url").pathToFileURL(__filename).href`;
            }
            if (property === "filename") {
                return `__filename`;
            }
            if (property === "dirname") {
                return `__dirname`;
            }
            return null;
        },
    };

    return plugin;
}
