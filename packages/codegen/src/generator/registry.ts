/**
 * Runtime registry generator.
 *
 * Generates `generated/runtime/registry.gen.ts` containing:
 * - `electroModules` — all exported `@Module()` classes
 * - `electroWindows` — all exported `@Window()` classes
 * - `electroViews` — all exported `@View()` classes
 * - `electroRootModules` — modules that aren't imported by any other module
 * - `electroAppDefinition` — if exactly one root module exists
 *
 * @module generator/registry
 */

import { join } from "node:path";
import type { GeneratedFile, ScanResult } from "../types";
import { GENERATED_HEADER, toRelativeImport } from "./import-utils";

interface SortableEntry {
    readonly id: string;
    readonly filePath: string;
}

function compareByIdThenPath(a: SortableEntry, b: SortableEntry): number {
    return a.id.localeCompare(b.id) || a.filePath.localeCompare(b.filePath);
}

function formatArray(entries: readonly string[]): string {
    if (entries.length === 0) return "[]";
    return `[\n${entries.map((e) => `    ${e},`).join("\n")}\n]`;
}

/**
 * Generate the runtime registry file.
 *
 * @returns A {@link GeneratedFile} for `generated/runtime/registry.gen.ts`, or `null` if empty.
 */
export function generateRegistry(scanResult: ScanResult, outputDir: string): GeneratedFile | null {
    const { modules, windows, views } = scanResult;

    if (modules.length === 0 && windows.length === 0 && views.length === 0) {
        return null;
    }

    const outputPath = "generated/runtime/registry.gen.ts";
    const fullOutputPath = join(outputDir, outputPath);
    const importLines: string[] = [];

    // Modules — sorted, exported only
    const exportedModules = [...modules].sort(compareByIdThenPath).flatMap((module, index) => {
        if (!module.exported) {
            console.warn(`[codegen] Skipping non-exported module "${module.className}" from runtime registry`);
            return [];
        }
        const localName = `__electro_module_${index}`;
        const importPath = toRelativeImport(fullOutputPath, module.filePath);
        importLines.push(`import { ${module.className} as ${localName} } from "${importPath}";`);
        return [{ ...module, localName }];
    });

    // Windows — sorted, exported only
    const exportedWindows = [...windows].sort(compareByIdThenPath).flatMap((window, index) => {
        if (!window.exported) {
            console.warn(`[codegen] Skipping non-exported window "${window.className}" from runtime registry`);
            return [];
        }
        const localName = `__electro_window_${index}`;
        const importPath = toRelativeImport(fullOutputPath, window.filePath);
        importLines.push(`import { ${window.className} as ${localName} } from "${importPath}";`);
        return [{ ...window, localName }];
    });

    // Views — sorted, exported only
    const exportedViews = [...views].sort(compareByIdThenPath).flatMap((view, index) => {
        if (!view.exported) {
            console.warn(`[codegen] Skipping non-exported view "${view.className}" from runtime registry`);
            return [];
        }
        const localName = `__electro_view_${index}`;
        const importPath = toRelativeImport(fullOutputPath, view.filePath);
        importLines.push(`import { ${view.className} as ${localName} } from "${importPath}";`);
        return [{ ...view, localName }];
    });

    // Root modules — modules that aren't imported by any other module
    const importedModuleIds = new Set(exportedModules.flatMap((m) => m.imports));
    const rootCandidates = exportedModules.filter((m) => !importedModuleIds.has(m.id));

    // Unresolved dependency warnings
    const exportedModuleIds = new Set(exportedModules.map((m) => m.id));
    for (const module of exportedModules) {
        for (const depId of module.imports) {
            if (!exportedModuleIds.has(depId)) {
                console.warn(`[codegen] Module "${module.id}" depends on non-exported module "${depId}" in runtime registry`);
            }
        }
    }

    if (exportedModules.length > 0 && rootCandidates.length === 0) {
        console.warn("[codegen] Runtime registry found no root module candidate; skipping electroAppDefinition");
    } else if (rootCandidates.length > 1) {
        console.warn(
            `[codegen] Runtime registry found multiple root module candidates (${rootCandidates.map((m) => m.id).join(", ")}); skipping electroAppDefinition`,
        );
    }

    const shouldEmitAppDefinition = rootCandidates.length === 1;
    const typeImports = shouldEmitAppDefinition
        ? ["AppKernelDefinition", "ModuleClass", "ViewClass", "WindowClass"]
        : ["ModuleClass", "ViewClass", "WindowClass"];

    const moduleArray = formatArray(exportedModules.map((m) => m.localName));
    const windowArray = formatArray(exportedWindows.map((w) => w.localName));
    const viewArray = formatArray(exportedViews.map((v) => v.localName));
    const rootArray = formatArray(rootCandidates.map((m) => m.localName));

    const rootCandidate = rootCandidates[0];
    const appDefinitionBlock =
        shouldEmitAppDefinition && rootCandidate
            ? `\nexport const electroAppDefinition = {\n    root: ${rootCandidate.localName},\n    modules: electroModules,\n    windows: electroWindows,\n    views: electroViews,\n} satisfies AppKernelDefinition;\n`
            : "";

    const content = `${GENERATED_HEADER}
import type { ${typeImports.join(", ")} } from "@electro/runtime";
${importLines.length > 0 ? `${importLines.join("\n")}\n` : ""}
export const electroModules = ${moduleArray} as const satisfies readonly ModuleClass[];
export const electroWindows = ${windowArray} as const satisfies readonly WindowClass[];
export const electroViews = ${viewArray} as const satisfies readonly ViewClass[];
export const electroRootModules = ${rootArray} as const satisfies readonly ModuleClass[];

export const electroRuntimeRegistry = {
    modules: electroModules,
    windows: electroWindows,
    views: electroViews,
    rootModules: electroRootModules,
} as const;${appDefinitionBlock}
export default electroRuntimeRegistry;
`;

    return { path: outputPath, content };
}
