/**
 * Scanner entry point.
 *
 * Discovers TypeScript files, parses them with OXC, extracts all
 * Electro-decorated classes, resolves module→provider relationships,
 * and returns a normalized {@link ScanResult}.
 *
 * @module scanner
 */

import type { ScannedModule, ScannedProvider, ScannedView, ScannedWindow, ScanResult } from "../types";
import { parseFile } from "./ast-parser";
import { type RawModuleDescriptor, type RawProviderDescriptor, scanFileClasses } from "./class-scanner";
import { discoverFiles } from "./file-discovery";

/**
 * Scan a project directory for Electro decorators and return a normalized result.
 *
 * This is the main entry point for the codegen scanner.
 *
 * @param basePath - Root directory to scan for `.ts` files.
 * @returns A {@link ScanResult} with all discovered modules, windows, and views.
 */
export async function scan(basePath: string): Promise<ScanResult> {
    const files = await discoverFiles(basePath);

    // Collect raw descriptors from all files
    const allRawModules: RawModuleDescriptor[] = [];
    const allRawProviders: RawProviderDescriptor[] = [];
    const allWindows: ScannedWindow[] = [];
    const allViews: ScannedView[] = [];

    for (const filePath of files) {
        const { program } = parseFile(filePath);
        const result = scanFileClasses(program, filePath);

        allRawModules.push(...result.modules);
        allRawProviders.push(...result.providers);
        allWindows.push(...result.windows);
        allViews.push(...result.views);
    }

    // Build lookup maps for resolution
    const providerByClassName = new Map(allRawProviders.map((p) => [p.className, p] as const));
    const moduleByClassName = new Map(allRawModules.map((m) => [m.className, m] as const));

    // Resolve modules: attach providers, resolve import class names → module IDs
    const modules: ScannedModule[] = allRawModules.map((raw) => {
        // Resolve provider class names to ScannedProvider objects
        const resolvedProviders: ScannedProvider[] = [];
        for (const className of raw.providerClassNames) {
            const provider = providerByClassName.get(className);
            if (!provider) {
                console.warn(`[codegen] Module "${raw.id}" references unknown provider class "${className}" in ${raw.filePath}`);
                continue;
            }

            resolvedProviders.push({
                className: provider.className,
                filePath: provider.filePath,
                exported: provider.exported,
                methods: [...provider.methods],
                signals: [...provider.signals],
                jobs: [...provider.jobs],
            });
        }

        // Resolve import class names to module IDs
        const resolvedImports: string[] = [];
        for (const className of raw.importClassNames) {
            const depModule = moduleByClassName.get(className);
            if (!depModule) {
                console.warn(`[codegen] Module "${raw.id}" references unknown module class "${className}" in ${raw.filePath}`);
                continue;
            }
            resolvedImports.push(depModule.id);
        }

        return {
            id: raw.id,
            className: raw.className,
            filePath: raw.filePath,
            exported: raw.exported,
            imports: [...new Set(resolvedImports)],
            providers: resolvedProviders,
            methods: [...raw.methods],
            signals: [...raw.signals],
            jobs: [...raw.jobs],
        };
    });

    return {
        modules,
        windows: allWindows,
        views: allViews,
    };
}
