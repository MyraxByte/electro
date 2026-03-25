/**
 * Pre-generation validation.
 *
 * Checks the scan result for consistency issues (duplicate IDs, missing refs,
 * unknown access/signal keys) and throws a {@link ValidationError} if any
 * diagnostics are found.
 *
 * @module generator/validator
 */

import { ValidationError } from "../errors";
import type { CodegenDiagnostic, GeneratorInput, ScanResult } from "../types";
import { collectSignals } from "./signal-utils";

/**
 * Validate the generator input and throw on any issues.
 *
 * All validation rules are checked exhaustively so the user sees every
 * problem at once rather than one at a time.
 */
export function validate(input: GeneratorInput): void {
    const diagnostics = collectDiagnostics(input);

    if (diagnostics.length > 0) {
        throw new ValidationError(diagnostics);
    }
}

// ── Helpers ─────────────────────────────────────────────────────────

function findDuplicates(values: readonly string[]): readonly string[] {
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    for (const value of values) {
        if (seen.has(value)) duplicates.add(value);
        else seen.add(value);
    }
    return [...duplicates];
}

/**
 * Compute all valid access keys from the scan result.
 *
 * Format: `"${moduleId}:${method.id}"` for every module and its providers.
 */
export function computeAccessKeys(scanResult: ScanResult): Set<string> {
    const keys = new Set<string>();

    for (const module of scanResult.modules) {
        for (const method of module.methods) {
            keys.add(`${module.id}:${method.id}`);
        }
        for (const provider of module.providers) {
            for (const method of provider.methods) {
                keys.add(`${module.id}:${method.id}`);
            }
        }
    }

    return keys;
}

/**
 * Compute all valid signal keys from the scan result.
 *
 * Format: raw `signal.id` for every module and its providers.
 */
export function computeSignalKeys(scanResult: ScanResult): Set<string> {
    return new Set(collectSignals(scanResult.modules).keys());
}

// ── Core diagnostic collector ───────────────────────────────────────

function collectDiagnostics(input: GeneratorInput): CodegenDiagnostic[] {
    const { scanResult } = input;
    const diagnostics: CodegenDiagnostic[] = [];

    // 1. Duplicate module IDs
    for (const moduleId of findDuplicates(scanResult.modules.map((m) => m.id))) {
        diagnostics.push({
            code: "duplicate-module-id",
            message: `Duplicate module id "${moduleId}" detected in scan result`,
        });
    }

    // 2. Duplicate methods within a module (including its providers)
    for (const module of scanResult.modules) {
        const allMethodIds = [...module.methods.map((m) => m.id), ...module.providers.flatMap((p) => p.methods.map((m) => m.id))];
        for (const methodId of findDuplicates(allMethodIds)) {
            diagnostics.push({
                code: "duplicate-module-method",
                message: `Module "${module.id}" exposes duplicate method id "${methodId}"`,
            });
        }
    }

    // 3. Duplicate window IDs
    for (const windowId of findDuplicates(scanResult.windows.map((w) => w.id))) {
        diagnostics.push({
            code: "duplicate-window-id",
            message: `Duplicate window id "${windowId}" detected in scan result`,
        });
    }

    // 4. Duplicate view IDs
    for (const viewId of findDuplicates(scanResult.views.map((v) => v.id))) {
        diagnostics.push({
            code: "duplicate-view-id",
            message: `Duplicate view id "${viewId}" detected in scan result`,
        });
    }

    // 5. Unknown access keys in views
    const knownAccessKeys = computeAccessKeys(scanResult);
    for (const view of scanResult.views) {
        for (const accessKey of view.access) {
            if (!knownAccessKeys.has(accessKey)) {
                diagnostics.push({
                    code: "unknown-access-key",
                    message: `View "${view.id}" references unknown access key "${accessKey}"`,
                    filePath: view.filePath,
                });
            }
        }
    }

    // 6. Unknown signal keys in views
    const knownSignalKeys = computeSignalKeys(scanResult);
    for (const view of scanResult.views) {
        for (const signalKey of view.signals) {
            if (!knownSignalKeys.has(signalKey)) {
                diagnostics.push({
                    code: "unknown-signal-key",
                    message: `View "${view.id}" references unknown signal key "${signalKey}"`,
                    filePath: view.filePath,
                });
            }
        }
    }

    // 7. GeneratorViewDefinition IDs must match a @View class
    if (input.views && input.views.length > 0) {
        const scannedViewIds = new Set(scanResult.views.map((v) => v.id));
        for (const viewDef of input.views) {
            if (!scannedViewIds.has(viewDef.id)) {
                diagnostics.push({
                    code: "missing-runtime-view",
                    message: `Generator view definition "${viewDef.id}" has no matching @View() class`,
                });
            }
        }
    }

    return diagnostics;
}
