/**
 * Method-level decorator scanner.
 *
 * Extracts `@command`, `@query`, `@signal`, and `@job` decorated methods
 * from a class body AST node.
 *
 * @module scanner/method-scanner
 */

import type { ScannedJob, ScannedMethod, ScannedSignal, ScannedSignalPayload } from "../types";
import { type ASTNode, findDecorator, getDecoratorObjectArg, getIdentifierName, getObjectProperty, getPropertyName, getStringLiteral } from "./ast-parser";
import { deriveMethodId } from "./id-derivation";

/** Result of scanning a class body for decorated methods. */
export interface MethodScanResult {
    readonly methods: ScannedMethod[];
    readonly signals: ScannedSignal[];
    readonly jobs: ScannedJob[];
}

/** Lifecycle method names that should not be treated as bridge methods. */
const LIFECYCLE_METHODS = new Set(["onInit", "onStart", "onReady", "onShutdown", "onDispose"]);

interface MethodParameter {
    readonly index: number;
    readonly name: string;
}

function isInjectSignalBusCall(node: ASTNode | null | undefined): boolean {
    if (!node || node.type !== "CallExpression") return false;

    const callee = node.callee as ASTNode | null;
    if (callee?.type !== "Identifier" || callee.name !== "inject") return false;

    const args = (node.arguments as ASTNode[] | undefined) ?? [];
    return args[0]?.type === "Identifier" && args[0].name === "SignalBus";
}

function collectSignalBusBindings(classNode: ASTNode): Set<string> {
    const bindings = new Set<string>();
    const members = ((classNode.body as ASTNode | null)?.body as ASTNode[] | undefined) ?? [];

    for (const member of members) {
        if (member.type !== "PropertyDefinition" || member.computed) continue;
        if (!isInjectSignalBusCall(member.value as ASTNode | null | undefined)) continue;

        const propertyName = getPropertyName(member.key as ASTNode);
        if (propertyName) bindings.add(propertyName);
    }

    return bindings;
}

function getMethodParameters(member: ASTNode): MethodParameter[] {
    const params = (member.value?.params as ASTNode[] | undefined) ?? [];
    const result: MethodParameter[] = [];

    params.forEach((param, index) => {
        const name = getIdentifierName(param);
        if (name) {
            result.push({ index, name });
        }
    });

    return result;
}

function findParameterIndex(parameters: readonly MethodParameter[], name: string): number | null {
    const parameter = parameters.find((item) => item.name === name);
    return parameter ? parameter.index : null;
}

function analyzePublishedPayload(payloadNode: ASTNode | null | undefined, parameters: readonly MethodParameter[]): ScannedSignalPayload {
    if (!payloadNode) {
        return { kind: "void" };
    }

    if (payloadNode.type === "Identifier") {
        if (payloadNode.name === "undefined") {
            return { kind: "void" };
        }

        const parameterIndex = findParameterIndex(parameters, payloadNode.name);
        if (parameterIndex !== null) {
            return {
                kind: "method-parameter",
                parameterIndex,
            };
        }

        return { kind: "unknown" };
    }

    if (payloadNode.type !== "ObjectExpression") {
        return { kind: "unknown" };
    }

    let parameterName: string | null = null;
    const keys: string[] = [];

    for (const property of (payloadNode.properties as ASTNode[] | undefined) ?? []) {
        if (property.type !== "Property" || property.kind !== "init" || property.computed) {
            return { kind: "unknown" };
        }

        const keyName = getPropertyName(property.key as ASTNode);
        const value = property.value as ASTNode | null;

        if (!keyName || !value || value.type !== "MemberExpression" || value.computed) {
            return { kind: "unknown" };
        }

        const objectName = getIdentifierName(value.object as ASTNode | null);
        const propertyName = getPropertyName(value.property as ASTNode | null);

        if (!objectName || !propertyName || keyName !== propertyName) {
            return { kind: "unknown" };
        }

        if (parameterName === null) {
            parameterName = objectName;
        } else if (parameterName !== objectName) {
            return { kind: "unknown" };
        }

        keys.push(keyName);
    }

    if (!parameterName) {
        return { kind: "unknown" };
    }

    const parameterIndex = findParameterIndex(parameters, parameterName);
    if (parameterIndex === null) {
        return { kind: "unknown" };
    }

    return {
        kind: "method-parameter-pick",
        parameterIndex,
        keys,
    };
}

function isSignalBusMemberObject(node: ASTNode | null | undefined, signalBusBindings: ReadonlySet<string>): boolean {
    if (!node || node.type !== "MemberExpression" || node.computed) return false;

    const propertyName = getPropertyName(node.property as ASTNode | null);
    return node.object?.type === "ThisExpression" && !!propertyName && signalBusBindings.has(propertyName);
}

function isSignalBusCallTarget(node: ASTNode | null | undefined, signalBusBindings: ReadonlySet<string>): boolean {
    return isSignalBusMemberObject(node, signalBusBindings) || isInjectSignalBusCall(node);
}

function walkAst(node: ASTNode | null | undefined, visit: (node: ASTNode) => void): void {
    if (!node || typeof node !== "object") return;

    visit(node);

    for (const value of Object.values(node)) {
        if (Array.isArray(value)) {
            for (const item of value) {
                walkAst(item as ASTNode | null | undefined, visit);
            }
            continue;
        }

        walkAst(value as ASTNode | null | undefined, visit);
    }
}

function scanProgrammaticSignals(member: ASTNode, ownerClassName: string, methodName: string, signalBusBindings: ReadonlySet<string>): ScannedSignal[] {
    const result: ScannedSignal[] = [];
    const parameters = getMethodParameters(member);

    walkAst(member.value?.body as ASTNode | null | undefined, (node) => {
        if (node.type !== "CallExpression") return;

        const callee = node.callee as ASTNode | null;
        if (!callee || callee.type !== "MemberExpression" || callee.computed) return;
        if (!isSignalBusCallTarget(callee.object as ASTNode | null, signalBusBindings)) return;

        const callKind = getPropertyName(callee.property as ASTNode | null);
        if (callKind !== "publish" && callKind !== "subscribe") return;

        const args = (node.arguments as ASTNode[] | undefined) ?? [];
        const signalId = getStringLiteral(args[0]);
        if (!signalId) return;

        result.push({
            id: signalId,
            methodName,
            ownerClassName,
            source: callKind,
            payload: callKind === "publish" ? analyzePublishedPayload(args[1], parameters) : { kind: "unknown" },
        });
    });

    return result;
}

/**
 * Scan a class body for `@command`, `@query`, `@signal`, and `@job` decorated methods.
 *
 * Skips:
 * - Non-method members (properties, getters, setters, constructors)
 * - Static methods
 * - Private methods (TypeScript `private` keyword)
 * - Computed property names
 * - Lifecycle hook methods (onInit, onStart, onReady, onShutdown, onDispose)
 */
export function scanMethods(classNode: ASTNode, ownerClassName: string): MethodScanResult {
    const methods: ScannedMethod[] = [];
    const signals: ScannedSignal[] = [];
    const jobs: ScannedJob[] = [];
    const signalBusBindings = collectSignalBusBindings(classNode);

    const members = ((classNode.body as ASTNode | null)?.body as ASTNode[] | undefined) ?? [];

    for (const member of members) {
        if (member.type !== "MethodDefinition" || member.kind !== "method" || member.computed) {
            continue;
        }

        if (member.static || member.accessibility === "private") {
            continue;
        }

        const methodName = getPropertyName(member.key as ASTNode);
        if (!methodName) continue;

        signals.push(...scanProgrammaticSignals(member, ownerClassName, methodName, signalBusBindings));

        // Skip lifecycle hooks
        if (LIFECYCLE_METHODS.has(methodName)) continue;

        const isCommand = findDecorator(member, "command");
        const isQuery = findDecorator(member, "query");
        const isSignal = findDecorator(member, "signal");
        const isJob = findDecorator(member, "job");

        // @command / @query → bridge method
        if (isCommand || isQuery) {
            const decoratorName = isCommand ? "command" : "query";
            const config = getDecoratorObjectArg(member, decoratorName);
            const explicitId = getStringLiteral(config ? getObjectProperty(config, "id") : null);

            methods.push({
                id: deriveMethodId(methodName, explicitId),
                methodName,
                kind: isCommand ? "command" : "query",
                ownerClassName,
            });
        }

        // @signal → signal handler
        if (isSignal) {
            const config = getDecoratorObjectArg(member, "signal");
            const explicitId = getStringLiteral(config ? getObjectProperty(config, "id") : null);

            signals.push({
                id: deriveMethodId(methodName, explicitId),
                methodName,
                ownerClassName,
                source: "decorator",
                payload: {
                    kind: "method-parameter",
                    parameterIndex: 0,
                },
            });
        }

        // @job → background job
        if (isJob) {
            const config = getDecoratorObjectArg(member, "job");
            const explicitId = getStringLiteral(config ? getObjectProperty(config, "id") : null);
            const cron = getStringLiteral(config ? getObjectProperty(config, "cron") : null);

            jobs.push({
                id: deriveMethodId(methodName, explicitId),
                methodName,
                ownerClassName,
                cron,
            });
        }
    }

    return { methods, signals, jobs };
}
