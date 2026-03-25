import { extname } from "node:path";
import type { InlineConfig, Plugin } from "vite";
import { mergeConfig, build as viteBuild } from "vite";

const VIRTUAL_ENTRY_ID = "\0electro:isolate-entries";
const DEFAULT_ENTRY_EXTENSION = ".js";

function resolveEntryExtension(config: InlineConfig): string {
    const output = config.build?.rolldownOptions?.output;
    if (Array.isArray(output)) {
        const candidate = output.find((entry) => typeof entry.entryFileNames === "string");
        if (typeof candidate?.entryFileNames === "string") {
            return extname(candidate.entryFileNames) || DEFAULT_ENTRY_EXTENSION;
        }

        return DEFAULT_ENTRY_EXTENSION;
    }

    if (typeof output?.entryFileNames === "string") {
        return extname(output.entryFileNames) || DEFAULT_ENTRY_EXTENSION;
    }

    return DEFAULT_ENTRY_EXTENSION;
}

/**
 * Isolates multiple entry points into separate sub-builds.
 * Dormant (no-op) if only one entry detected.
 */
export function isolateEntriesPlugin(subBuildConfig: InlineConfig): Plugin {
    const emitted = new Set<string>();
    let entries: Array<{ name: string; path: string }> | null = null;

    return {
        name: "electro:isolate-entries",
        apply: "build",

        options(opts) {
            const { input } = opts;
            if (!input || typeof input !== "object" || Array.isArray(input)) return;

            const keys = Object.keys(input);
            if (keys.length <= 1) return; // dormant: single entry

            entries = Object.entries(input as Record<string, string>).map(([name, path]) => ({ name, path }));
            opts.input = VIRTUAL_ENTRY_ID;
        },

        resolveId(id) {
            if (id === VIRTUAL_ENTRY_ID) return id;
            return null;
        },

        async load(id) {
            if (id !== VIRTUAL_ENTRY_ID || !entries) return;

            const entryExtension = resolveEntryExtension(subBuildConfig);
            for (const entry of entries) {
                const config = mergeConfig(subBuildConfig, {
                    build: { write: false, watch: null },
                    logLevel: "warn" as const,
                    configFile: false,
                }) as InlineConfig;

                // Override input for this entry
                if (config.build) {
                    const existingOutput = config.build.rolldownOptions?.output;
                    config.build.rolldownOptions = {
                        ...config.build.rolldownOptions,
                        input: { [entry.name]: entry.path },
                        output: Array.isArray(existingOutput)
                            ? existingOutput.map((output) => ({
                                  ...output,
                                  entryFileNames: `${entry.name}${entryExtension}`,
                              }))
                            : {
                                  ...existingOutput,
                                  entryFileNames: `${entry.name}${entryExtension}`,
                              },
                    };
                }

                const result = (await viteBuild(config)) as {
                    output: Array<{ type: string; fileName: string; code?: string; source?: Uint8Array | string }>;
                };

                for (const chunk of result.output) {
                    if (emitted.has(chunk.fileName)) continue;
                    const source = chunk.type === "chunk" ? chunk.code : chunk.source;
                    if (source == null) continue;
                    this.emitFile({
                        type: "asset",
                        fileName: chunk.fileName,
                        source,
                    });
                    emitted.add(chunk.fileName);
                }
            }

            return "// virtual entry — removed in generateBundle";
        },

        generateBundle(_, bundle) {
            for (const [name, chunk] of Object.entries(bundle)) {
                if (name.includes("isolate-entries")) {
                    delete bundle[name];
                    continue;
                }

                if (chunk.type === "chunk" && chunk.facadeModuleId === VIRTUAL_ENTRY_ID) {
                    delete bundle[name];
                }
            }
        },
    };
}
