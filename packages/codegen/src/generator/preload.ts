/**
 * Preload script generator.
 *
 * Generates one preload script per `@View()` class that:
 * 1. Imports `contextBridge` and `ipcRenderer` from Electron
 * 2. Creates a bridge client via `createBridgeClient()` from `@electro/runtime/client`
 * 3. Exposes the bridge on `window.__ELECTRO_RENDERER__`
 * 4. Optionally imports a user-defined preload extension
 *
 * @module generator/preload
 */

import { dirname, isAbsolute, resolve } from "node:path";
import type { GeneratedFile, GeneratorViewDefinition, ScannedView } from "../types";
import { GENERATED_HEADER, toRuntimeImport } from "./import-utils";

/**
 * Resolve a user-specified preload extension import path relative to the
 * generated preload script's output location.
 */
function resolvePreloadExtensionImport(viewDef: GeneratorViewDefinition, generatedPreloadPath: string, specifier: string): string {
    const trimmed = specifier.trim();
    if (trimmed.length === 0) return trimmed;

    // Bare specifiers (package names) pass through unchanged
    const isPathLike = trimmed.startsWith(".") || isAbsolute(trimmed);
    if (!isPathLike) return trimmed;

    // Resolve relative to the view definition's source file, then make relative to output
    const resolvedPath = isAbsolute(trimmed) ? trimmed : resolve(dirname(viewDef.__source), trimmed);
    return toRuntimeImport(generatedPreloadPath, resolvedPath);
}

/**
 * Generate a preload script for a single view.
 *
 * @param view - The scanned `@View()` class.
 * @param viewDef - Optional CLI-provided view definition (for preload extension paths).
 * @param outputDir - The output directory where `generated/` lives.
 * @returns A {@link GeneratedFile} for `generated/preload/{viewId}.gen.ts`.
 */
export function generatePreload(view: ScannedView, viewDef: GeneratorViewDefinition | undefined, outputDir: string): GeneratedFile {
    const outputPath = `generated/preload/${view.id}.gen.ts`;
    const fullOutputPath = `${outputDir}/${outputPath}`;

    let content = `${GENERATED_HEADER}
import { contextBridge, ipcRenderer } from "electron";
import { createBridgeClient } from "@electro/runtime/client";

contextBridge.exposeInMainWorld("__ELECTRO_RENDERER__", createBridgeClient({
    viewId: ${JSON.stringify(view.id)},
    ipcRenderer,
}));
`;

    // Resolve and append user preload extension imports
    if (viewDef?.preload && viewDef.preload.length > 0) {
        const resolvedImport = resolvePreloadExtensionImport(viewDef, fullOutputPath, viewDef.preload);
        if (resolvedImport.length > 0) {
            content += `\n// User preload extension\nimport ${JSON.stringify(resolvedImport)};\n`;
        }
    }

    return { path: outputPath, content };
}
