/**
 * Generator entry point.
 *
 * Orchestrates validation and generation of all artifact types:
 * preload scripts, bridge type files, runtime registry, and env types.
 *
 * @module generator
 */

import type { GeneratedFile, GeneratorInput, GeneratorOutput, GeneratorViewDefinition, PackageTypeOutput } from "../types";
import { generateEnvTypes } from "./env-types";
import { generatePackageTypes } from "./package-types";
import { generatePreload } from "./preload";
import { generateRegistry } from "./registry";
import { validate } from "./validator";

/**
 * Generate all codegen artifacts from a scan result.
 *
 * 1. Validates the input (throws {@link ValidationError} on failure).
 * 2. For each `@View()`, generates a preload script.
 * 3. Generates the runtime registry.
 * 4. Generates the ambient `electro-env.d.ts` type files.
 *
 * @param input - The generator input containing scan result, view definitions, and paths.
 * @returns Generated files and the env types file.
 * @throws {ValidationError} If the scan result has consistency issues.
 */
export function generate(input: GeneratorInput): GeneratorOutput {
    validate(input);

    const { scanResult, outputDir, srcDir } = input;
    const files: GeneratedFile[] = [];

    // Build view definition lookup for preload extension resolution
    const viewDefById = new Map<string, GeneratorViewDefinition>();
    if (input.views) {
        for (const viewDef of input.views) {
            viewDefById.set(viewDef.id, viewDef);
        }
    }

    // Per-view artifacts
    for (const view of scanResult.views) {
        const viewDef = viewDefById.get(view.id);

        // Preload script
        files.push(generatePreload(view, viewDef, outputDir));
    }

    // Runtime registry
    const registry = generateRegistry(scanResult, outputDir);
    if (registry) {
        files.push(registry);
    }

    // Env types
    const envTypes = generateEnvTypes(scanResult, srcDir);

    // Per-view renderer electro-env.d.ts
    const packageTypes: readonly PackageTypeOutput[] = input.packageTargets ? generatePackageTypes(scanResult, input.packageTargets) : [];

    return { files, envTypes, packageTypes };
}
