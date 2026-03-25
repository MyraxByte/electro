import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { RendererViewDefinition } from "./views";

export interface RuntimeViewRegistryEntry {
    readonly id: string;
    readonly preload: string | null;
    readonly source: string;
}

/**
 * Build the dev-mode view registry.
 *
 * Each view now has its own Vite dev server, so the source URL is the root
 * of that server (i.e. the server URL itself, which serves index.html at /).
 *
 * @param outputDir  - Absolute path to the .electro output directory
 * @param viewUrls   - Map of viewId → dev server base URL (e.g. "http://127.0.0.1:5173")
 * @param views      - Renderer view definitions
 */
export function createDevRuntimeViewRegistry(
    outputDir: string,
    viewUrls: Map<string, string>,
    views: readonly RendererViewDefinition[],
): readonly RuntimeViewRegistryEntry[] {
    return views.map((view) => ({
        id: view.id,
        preload: resolve(outputDir, "preload", `${view.id}.cjs`),
        source: viewUrls.get(view.id) ?? "about:blank",
    }));
}

export function createBuildRuntimeViewRegistry(outDir: string, views: readonly RendererViewDefinition[]): readonly RuntimeViewRegistryEntry[] {
    return views.map((view) => ({
        id: view.id,
        preload: resolve(outDir, "preload", `${view.id}.cjs`),
        source: pathToFileURL(resolve(outDir, "renderer", view.id, "index.html")).href,
    }));
}
