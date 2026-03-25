/**
 * Ambient environment type file generator.
 *
 * Generates `electro-env.d.ts` that augments `@electro` with:
 * - Registry interfaces (methods, signals, jobs, injectables, windows, views)
 * - Per-class authoring API augmentations
 *
 * This file provides IDE completions and type safety for the generated code.
 *
 * @module generator/env-types
 */

import { join } from "node:path";
import type { GeneratedFile, ScannedMethod, ScannedModule, ScannedSignal, ScannedView, ScannedWindow, ScanResult } from "../types";
import { GENERATED_HEADER, quoteProperty, toRelativeImport } from "./import-utils";
import { collectSignals } from "./signal-utils";

const ENV_TYPES_HEADER = `${GENERATED_HEADER}// @ts-nocheck
// Electro runtime authoring contract types — provides IDE completions for modules, signals, jobs, windows, and runtime-declared views.

export {};

type _Instance<T> = T extends abstract new (...args: never[]) => infer R ? R : never;
type _ModuleAuthoringApi<TModuleId extends import("@electrojs/runtime").ModuleRegistryId> =
    import("@electrojs/runtime").ModuleAuthoringApi<TModuleId>;
type _WindowAuthoringApi = import("@electrojs/runtime").WindowAuthoringApi;
type _ViewAuthoringApi = import("@electrojs/runtime").ViewAuthoringApi;
type _InvokeMethod<T, K extends PropertyKey> =
    K extends keyof _Instance<T>
        ? _Instance<T>[K] extends (...args: infer A) => infer V
            ? (...args: A) => Promise<Awaited<V>>
            : never
        : never;
type _SignalPayloadFromMethodParam<T, K extends PropertyKey, I extends number> =
    K extends keyof _Instance<T>
        ? _Instance<T>[K] extends (...args: infer A) => infer _Ignored
            ? I extends keyof A
                ? A[I]
                : void
            : never
        : never;
type _SignalPayloadFromMethod<T, K extends PropertyKey> =
    _SignalPayloadFromMethodParam<T, K, 0>;
`;

/** Generate a method type reference for env types. */
function methodTypeRef(envFilePath: string, method: ScannedMethod, filePath: string): string {
    const importPath = toRelativeImport(envFilePath, filePath);
    return `_InvokeMethod<typeof import("${importPath}").${method.ownerClassName}, ${JSON.stringify(method.methodName)}>`;
}

/** Generate a signal payload type reference for env types. */
function signalPayloadTypeRef(envFilePath: string, signal: ScannedSignal, filePath: string): string {
    const importPath = toRelativeImport(envFilePath, filePath);
    const ownerRef = `typeof import("${importPath}").${signal.ownerClassName}`;

    switch (signal.payload.kind) {
        case "method-parameter":
            if (signal.source === "decorator" && signal.payload.parameterIndex === 0) {
                return `_SignalPayloadFromMethod<${ownerRef}, ${JSON.stringify(signal.methodName)}>`;
            }

            return `_SignalPayloadFromMethodParam<${ownerRef}, ${JSON.stringify(signal.methodName)}, ${signal.payload.parameterIndex}>`;
        case "method-parameter-pick": {
            const keys = signal.payload.keys.map((key) => JSON.stringify(key)).join(" | ") || "never";
            return `Pick<_SignalPayloadFromMethodParam<${ownerRef}, ${JSON.stringify(signal.methodName)}, ${signal.payload.parameterIndex}>, ${keys}>`;
        }
        case "void":
            return "void";
        case "unknown":
            return "unknown";
    }
}

// ── Registry generators ─────────────────────────────────────────────

function generateModuleMethodMap(modules: readonly ScannedModule[], envFilePath: string): string {
    const entries: string[] = [];

    for (const module of modules) {
        // Module's own methods
        for (const method of module.methods) {
            const key = `${module.id}:${method.id}`;
            entries.push(`        ${JSON.stringify(key)}: ${methodTypeRef(envFilePath, method, module.filePath)};`);
        }
        // Provider methods
        for (const provider of module.providers) {
            for (const method of provider.methods) {
                const key = `${module.id}:${method.id}`;
                entries.push(`        ${JSON.stringify(key)}: ${methodTypeRef(envFilePath, method, provider.filePath)};`);
            }
        }
    }

    return `\n    interface ModuleMethodMap {\n${entries.join("\n")}\n    }\n`;
}

function generateModuleApiRegistry(modules: readonly ScannedModule[], envFilePath: string): string {
    const entries = modules
        .filter((m) => m.exported)
        .map((module) => {
            const allMethods = [
                ...module.methods.map((m) => ({ method: m, filePath: module.filePath })),
                ...module.providers.flatMap((p) => p.methods.map((m) => ({ method: m, filePath: p.filePath }))),
            ];

            const methodEntries = allMethods.map(
                ({ method, filePath }) => `            ${quoteProperty(method.id)}: ${methodTypeRef(envFilePath, method, filePath)};`,
            );

            const body = methodEntries.length > 0 ? `{\n${methodEntries.join("\n")}\n        }` : "{}";
            return `        ${JSON.stringify(module.id)}: ${body};`;
        });

    return `\n    interface ModuleApiRegistry {\n${entries.join("\n")}\n    }\n`;
}

function generateModuleSignalPayloadMap(modules: readonly ScannedModule[], envFilePath: string): string {
    const seen = new Map<string, string>();

    for (const entry of collectSignals(modules).values()) {
        seen.set(entry.signal.id, `        ${JSON.stringify(entry.signal.id)}: ${signalPayloadTypeRef(envFilePath, entry.signal, entry.filePath)};`);
    }

    return `\n    interface ModuleSignalPayloadMap {\n${[...seen.values()].join("\n")}\n    }\n`;
}

function generateModuleJobRegistry(modules: readonly ScannedModule[]): string {
    const entries = modules.map((module) => {
        const allJobIds = [...new Set([...module.jobs.map((j) => j.id), ...module.providers.flatMap((p) => p.jobs.map((j) => j.id))])];
        const body = allJobIds.length > 0 ? allJobIds.map((id) => JSON.stringify(id)).join(" | ") : "never";
        return `        ${JSON.stringify(module.id)}: ${body};`;
    });

    return `\n    interface ModuleJobRegistry {\n${entries.join("\n")}\n    }\n`;
}

function generateInjectableClassRegistry(modules: readonly ScannedModule[], envFilePath: string): string {
    const seen = new Map<string, string>();

    for (const module of modules) {
        for (const provider of module.providers) {
            if (provider.exported && !seen.has(provider.className)) {
                const importPath = toRelativeImport(envFilePath, provider.filePath);
                seen.set(provider.className, `        ${JSON.stringify(provider.className)}: typeof import("${importPath}").${provider.className};`);
            }
        }
    }

    return `\n    interface InjectableClassRegistry {\n${[...seen.values()].join("\n")}\n    }\n`;
}

function generateWindowClassRegistry(windows: readonly ScannedWindow[], envFilePath: string): string {
    const entries = windows
        .filter((w) => w.exported)
        .map((window) => {
            const importPath = toRelativeImport(envFilePath, window.filePath);
            return `        ${JSON.stringify(window.id)}: typeof import("${importPath}").${window.className};`;
        });

    return `\n    interface WindowClassRegistry {\n${entries.join("\n")}\n    }\n`;
}

function generateViewClassRegistry(views: readonly ScannedView[], envFilePath: string): string {
    const entries = views
        .filter((v) => v.exported)
        .map((view) => {
            const importPath = toRelativeImport(envFilePath, view.filePath);
            return `        ${JSON.stringify(view.id)}: typeof import("${importPath}").${view.className};`;
        });

    return `\n    interface ViewClassRegistry {\n${entries.join("\n")}\n    }\n`;
}

function generateCommonViewAccessRegistry(modules: readonly ScannedModule[]): string {
    const keys = [
        ...new Set([
            ...modules.flatMap((module) => module.methods.map((method) => `${module.id}:${method.id}`)),
            ...modules.flatMap((module) => module.providers.flatMap((provider) => provider.methods.map((method) => `${module.id}:${method.id}`))),
        ]),
    ];

    const entries = keys.map((key) => `        ${JSON.stringify(key)}: true;`);
    return `\n    interface ViewAccessRegistry {\n${entries.join("\n")}\n    }\n`;
}

function generateCommonViewSignalRegistry(modules: readonly ScannedModule[]): string {
    const signalIds = [...collectSignals(modules).keys()];
    const entries = signalIds.map((signalId) => `        ${JSON.stringify(signalId)}: true;`);
    return `\n    interface ViewSignalRegistry {\n${entries.join("\n")}\n    }\n`;
}

function generateCommonBundledViewIdRegistry(views: readonly ScannedView[]): string {
    const bundledViewIds = views.filter((view) => view.source.startsWith("view:")).map((view) => view.id);
    const entries = bundledViewIds.map((viewId) => `        ${JSON.stringify(viewId)}: true;`);
    return `\n    interface BundledViewIdRegistry {\n${entries.join("\n")}\n    }\n`;
}

// ── Authoring augmentations ─────────────────────────────────────────

function generateAuthoringAugmentations(scanResult: ScanResult, envFilePath: string): string {
    const augmentations = new Set<string>();
    const viewClassNames = new Set(scanResult.views.map((view) => view.className));
    const windowClassNames = new Set(scanResult.windows.map((window) => window.className));

    const addAugmentation = (filePath: string, className: string, authoringType: "module" | "window" | "view", exported: boolean, moduleId?: string) => {
        if (!exported) return;

        const importPath = toRelativeImport(envFilePath, filePath);
        let authoringRef: string;

        switch (authoringType) {
            case "module":
                authoringRef = `_ModuleAuthoringApi<${JSON.stringify(moduleId)}>`;
                break;
            case "window":
                authoringRef = "_WindowAuthoringApi";
                break;
            case "view":
                authoringRef = "_ViewAuthoringApi";
                break;
        }

        augmentations.add(`import "${importPath}";\ndeclare module "${importPath}" {\n    interface ${className} extends ${authoringRef} {}\n}`);
    };

    for (const module of scanResult.modules) {
        addAugmentation(module.filePath, module.className, "module", module.exported, module.id);
        for (const provider of module.providers) {
            if (viewClassNames.has(provider.className) || windowClassNames.has(provider.className)) {
                continue;
            }

            addAugmentation(provider.filePath, provider.className, "module", provider.exported, module.id);
        }
    }

    for (const window of scanResult.windows) {
        addAugmentation(window.filePath, window.className, "window", window.exported);
    }

    for (const view of scanResult.views) {
        addAugmentation(view.filePath, view.className, "view", view.exported);
    }

    return augmentations.size > 0 ? `\n${[...augmentations].join("\n\n")}\n` : "\n";
}

// ── Main generator ──────────────────────────────────────────────────

/**
 * Generate the `electro-env.d.ts` ambient type declaration file.
 *
 * @param scanResult - The full scan result.
 * @param srcDir - The project source root (env types file lives at `{srcDir}/electro-env.d.ts`).
 * @returns A {@link GeneratedFile} for `electro-env.d.ts`.
 */
export function generateEnvTypes(scanResult: ScanResult, srcDir: string): GeneratedFile {
    const envFilePath = join(srcDir, "electro-env.d.ts");

    const content = `${ENV_TYPES_HEADER}
declare module "@electrojs/runtime" {
${generateModuleMethodMap(scanResult.modules, envFilePath)}${generateModuleApiRegistry(scanResult.modules, envFilePath)}${generateModuleSignalPayloadMap(scanResult.modules, envFilePath)}${generateModuleJobRegistry(scanResult.modules)}${generateInjectableClassRegistry(scanResult.modules, envFilePath)}${generateWindowClassRegistry(scanResult.windows, envFilePath)}${generateViewClassRegistry(scanResult.views, envFilePath)}
}

declare module "@electrojs/common" {
${generateCommonViewAccessRegistry(scanResult.modules)}${generateCommonViewSignalRegistry(scanResult.modules)}${generateCommonBundledViewIdRegistry(scanResult.views)}
}${generateAuthoringAugmentations(scanResult, envFilePath)}`;

    return { path: "electro-env.d.ts", content };
}
