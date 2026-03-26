/**
 * Renderer package `electro-env.d.ts` generator.
 *
 * Generates a package-local ambient declaration file for renderer packages so IDEs
 * track it as part of the TypeScript project instead of as a mutable dependency
 * under `node_modules`.
 *
 * @module generator/package-types
 */

import { join } from "node:path";
import type { PackageTypeOutput, PackageTypeTarget, ScannedMethod, ScannedModule, ScannedSignal, ScannedView, ScanResult } from "../types";
import { GENERATED_HEADER, toRelativeImport } from "./import-utils";
import { collectSignals } from "./signal-utils";

const VIEW_HEADER = `${GENERATED_HEADER}// @ts-nocheck
// ElectroJS renderer bridge contract types — provides IDE completions for bridge access and forwarded signals.

export {};

type _Instance<T> = T extends abstract new (...args: never[]) => infer R ? R : never;
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
type _BridgeInputFromMethod<T, K extends PropertyKey> =
    K extends keyof _Instance<T>
        ? _Instance<T>[K] extends (...args: infer A) => infer _Ignored
            ? A extends []
                ? undefined
                : A extends [infer TOnly]
                    ? TOnly
                    : A
            : never
        : never;
type _BridgeOutputFromMethod<T, K extends PropertyKey> =
    K extends keyof _Instance<T>
        ? _Instance<T>[K] extends (...args: infer _Args) => infer V
            ? Awaited<V>
            : never
        : never;
`;

interface AllowedMethodEntry {
    readonly moduleId: string;
    readonly method: ScannedMethod;
    readonly filePath: string;
}

interface AllowedSignalEntry {
    readonly signal: ScannedSignal;
    readonly filePath: string;
}

function collectAllowedMethods(view: ScannedView, modules: readonly ScannedModule[]): AllowedMethodEntry[] {
    const allowedKeys = new Set(view.access);
    const result: AllowedMethodEntry[] = [];

    for (const module of modules) {
        for (const method of module.methods) {
            if (allowedKeys.has(`${module.id}:${method.id}`)) {
                result.push({ moduleId: module.id, method, filePath: module.filePath });
            }
        }

        for (const provider of module.providers) {
            for (const method of provider.methods) {
                if (allowedKeys.has(`${module.id}:${method.id}`)) {
                    result.push({ moduleId: module.id, method, filePath: provider.filePath });
                }
            }
        }
    }

    return result;
}

function collectAllowedSignals(view: ScannedView, modules: readonly ScannedModule[]): AllowedSignalEntry[] {
    const requested = new Set(view.signals);
    const result: AllowedSignalEntry[] = [];

    for (const entry of collectSignals(modules).values()) {
        if (requested.has(entry.signal.id)) {
            result.push({ signal: entry.signal, filePath: entry.filePath });
        }
    }

    return result;
}

function bridgeInputTypeRef(fromFile: string, entry: AllowedMethodEntry): string {
    const importPath = toRelativeImport(fromFile, entry.filePath);
    return `_BridgeInputFromMethod<typeof import("${importPath}").${entry.method.ownerClassName}, ${JSON.stringify(entry.method.methodName)}>`;
}

function bridgeOutputTypeRef(fromFile: string, entry: AllowedMethodEntry): string {
    const importPath = toRelativeImport(fromFile, entry.filePath);
    return `_BridgeOutputFromMethod<typeof import("${importPath}").${entry.method.ownerClassName}, ${JSON.stringify(entry.method.methodName)}>`;
}

function methodContractTypeRef(fromFile: string, entry: AllowedMethodEntry): string {
    return `import("@electrojs/renderer").BridgeContractEntry<${bridgeInputTypeRef(fromFile, entry)}, ${bridgeOutputTypeRef(fromFile, entry)}>`;
}

function signalTypeRef(fromFile: string, entry: AllowedSignalEntry): string {
    const importPath = toRelativeImport(fromFile, entry.filePath);
    const ownerRef = `typeof import("${importPath}").${entry.signal.ownerClassName}`;

    switch (entry.signal.payload.kind) {
        case "method-parameter":
            if (entry.signal.source === "decorator" && entry.signal.payload.parameterIndex === 0) {
                return `_SignalPayloadFromMethod<${ownerRef}, ${JSON.stringify(entry.signal.methodName)}>`;
            }

            return `_SignalPayloadFromMethodParam<${ownerRef}, ${JSON.stringify(entry.signal.methodName)}, ${entry.signal.payload.parameterIndex}>`;
        case "method-parameter-pick": {
            const keys = entry.signal.payload.keys.map((key) => JSON.stringify(key)).join(" | ") || "never";
            return `Pick<_SignalPayloadFromMethodParam<${ownerRef}, ${JSON.stringify(entry.signal.methodName)}, ${entry.signal.payload.parameterIndex}>, ${keys}>`;
        }
        case "void":
            return "void";
        case "unknown":
            return "unknown";
    }
}

function generateBridgeSection(view: ScannedView, modules: readonly ScannedModule[], fromFile: string): string {
    const allowedMethods = collectAllowedMethods(view, modules);
    const allowedSignals = collectAllowedSignals(view, modules);

    const methodEntries = (kind: ScannedMethod["kind"]) =>
        allowedMethods
            .filter((entry) => entry.method.kind === kind)
            .map((entry) => `        ${JSON.stringify(`${entry.moduleId}:${entry.method.id}`)}: ${methodContractTypeRef(fromFile, entry)};`)
            .join("\n");

    const queryEntries = [methodEntries("query"), methodEntries("command")].filter(Boolean).join("\n");
    const commandEntries = methodEntries("command");
    const signalEntries = allowedSignals.map((entry) => `        ${JSON.stringify(entry.signal.id)}: ${signalTypeRef(fromFile, entry)};`).join("\n");

    return `declare module "@electrojs/renderer" {
    interface BridgeQueries {
${queryEntries}
    }

    interface BridgeCommands {
${commandEntries}
    }

    interface BridgeSignals {
${signalEntries}
    }
}`;
}

function generateViewTypes(scanResult: ScanResult, view: ScannedView | undefined, fromFile: string): string {
    const bridgeSection = view ? generateBridgeSection(view, scanResult.modules, fromFile) : "";
    return `${VIEW_HEADER}
${bridgeSection}
`;
}

export function generatePackageTypes(scanResult: ScanResult, targets: readonly PackageTypeTarget[]): readonly PackageTypeOutput[] {
    return targets.map((target) => {
        const fromFile = join(target.packageRoot, "electro-env.d.ts");
        const view = scanResult.views.find((candidate) => candidate.id === target.viewId);
        const content = generateViewTypes(scanResult, view, fromFile);

        return {
            packageRoot: target.packageRoot,
            path: "electro-env.d.ts",
            content,
            indexDts: content,
        };
    });
}
