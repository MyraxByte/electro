/**
 * OXC parser wrapper and AST node utilities.
 *
 * Provides a thin abstraction over `oxc-parser` for parsing TypeScript files,
 * plus helper functions for extracting values from AST nodes.
 *
 * All node types use `ASTNode` (an opaque `any`) because OXC's generated
 * AST surface is broad and easier to handle through runtime narrowing.
 *
 * @module scanner/ast-parser
 */

import { readFileSync } from "node:fs";
import { parseSync } from "oxc-parser";

// OXC exposes a broad AST surface that is easier to handle through runtime
// narrowing than through a rigid shared node interface.
export interface ASTNode {
    readonly type?: string;
    readonly [key: string]: any;
}

/** Result of parsing a single TypeScript file. */
export interface ParseResult {
    readonly program: ASTNode;
    readonly filePath: string;
}

/**
 * Parse a TypeScript file from disk and return its AST.
 *
 * Parse errors are logged as warnings; parsing continues with best-effort recovery.
 */
export function parseFile(filePath: string): ParseResult {
    const source = readFileSync(filePath, "utf8");
    const result = parseSync(filePath, source, { sourceType: "module" });

    for (const error of result.errors) {
        console.warn(`[codegen] Parse error in ${filePath}: ${error.message}`);
    }

    return {
        program: result.program as unknown as ASTNode,
        filePath,
    };
}

// ── AST value extractors ────────────────────────────────────────────

/** Extract a string value from a Literal AST node. */
export function getStringLiteral(node: ASTNode | null | undefined): string | null {
    if (!node) return null;
    if (node.type === "Literal" && typeof node.value === "string") return node.value;
    return null;
}

/** Extract a boolean value from a Literal AST node. */
export function getBooleanLiteral(node: ASTNode | null | undefined): boolean | null {
    if (!node || node.type !== "Literal" || typeof node.value !== "boolean") return null;
    return node.value;
}

/** Extract an array of string literals from an ArrayExpression node. */
export function getStringArray(node: ASTNode | null | undefined): string[] {
    if (!node || node.type !== "ArrayExpression") return [];

    const result: string[] = [];
    for (const element of node.elements as (ASTNode | null)[]) {
        const value = getStringLiteral(element);
        if (value !== null) result.push(value);
    }
    return result;
}

/** Extract an array of identifier names from an ArrayExpression node. */
export function getIdentifierArray(node: ASTNode | null | undefined): string[] {
    if (!node || node.type !== "ArrayExpression") return [];

    const result: string[] = [];
    for (const element of node.elements as (ASTNode | null)[]) {
        if (element?.type === "Identifier" && typeof element.name === "string") {
            result.push(element.name);
        }
    }
    return result;
}

// ── AST node navigators ─────────────────────────────────────────────

/** Get the name of an Identifier or Literal node used as a property key. */
export function getPropertyName(node: ASTNode | null | undefined): string | null {
    if (!node) return null;
    if (node.type === "Identifier" && typeof node.name === "string") return node.name;
    if (node.type === "Literal" && typeof node.value === "string") return node.value;
    return null;
}

/** Get the value node of an ObjectExpression property by key name. */
export function getObjectProperty(objectNode: ASTNode, key: string): ASTNode | null {
    const properties = objectNode.properties as ASTNode[] | undefined;
    if (!properties) return null;

    for (const property of properties) {
        if (property.type !== "Property") continue;
        if (getPropertyName(property.key as ASTNode) === key) {
            return property.value as ASTNode;
        }
    }
    return null;
}

/** Get the name from an Identifier node. */
export function getIdentifierName(node: ASTNode | null | undefined): string | null {
    if (!node) return null;
    if (node.type === "Identifier" && typeof node.name === "string") return node.name;
    return null;
}

/** Get the class name from a ClassDeclaration or ClassExpression node. */
export function getClassName(node: ASTNode): string | null {
    if ((node.type === "ClassDeclaration" || node.type === "ClassExpression") && node.id) {
        return getIdentifierName(node.id as ASTNode);
    }
    return null;
}

/**
 * Find a decorator by name(s) on a node.
 *
 * Supports both bare identifiers (`@Module`) and call expressions (`@Module({})`).
 * Returns the decorator expression node if found, or `null`.
 */
export function findDecorator(node: ASTNode, name: string | readonly string[]): ASTNode | null {
    const names = Array.isArray(name) ? name : [name];
    const decorators = (node.decorators as ASTNode[] | undefined) ?? [];

    for (const decorator of decorators) {
        if (decorator.type !== "Decorator") continue;

        const expression = decorator.expression as ASTNode;

        // @Module (bare identifier)
        if (expression.type === "Identifier" && names.includes(expression.name)) {
            return expression;
        }

        // @Module({...}) (call expression)
        if (expression.type === "CallExpression") {
            const callee = expression.callee as ASTNode;
            if (callee.type === "Identifier" && names.includes(callee.name)) {
                return expression;
            }
        }
    }
    return null;
}

/**
 * Get the first object argument from a decorator call expression.
 *
 * For `@Module({ id: "auth" })`, returns the ObjectExpression `{ id: "auth" }`.
 * Returns `null` if the decorator isn't found, isn't a call expression,
 * or doesn't have an object as its first argument.
 */
export function getDecoratorObjectArg(node: ASTNode, name: string | readonly string[]): ASTNode | null {
    const decorator = findDecorator(node, name);
    if (!decorator || decorator.type !== "CallExpression") return null;

    const args = decorator.arguments as ASTNode[];
    const firstArg = args[0];
    if (!firstArg || firstArg.type !== "ObjectExpression") return null;

    return firstArg;
}

/**
 * Collect all exported names from a program's top-level statements.
 *
 * Handles: `export class X`, `export function X`, `export { X }`,
 * `export const X`, `export default X`, `export interface X`, `export type X`.
 */
export function extractExportedNames(program: ASTNode): Set<string> {
    const names = new Set<string>();
    const body = program.body as ASTNode[] | undefined;
    if (!body) return names;

    for (const node of body) {
        if (node.type === "ExportNamedDeclaration") {
            const declaration = node.declaration as ASTNode | null;

            if (
                declaration?.type === "ClassDeclaration" ||
                declaration?.type === "FunctionDeclaration" ||
                declaration?.type === "TSInterfaceDeclaration" ||
                declaration?.type === "TSTypeAliasDeclaration"
            ) {
                const name = getIdentifierName(declaration.id as ASTNode | null);
                if (name) names.add(name);
                continue;
            }

            if (declaration?.type === "VariableDeclaration") {
                for (const declarator of declaration.declarations as ASTNode[]) {
                    const name = getIdentifierName(declarator.id as ASTNode | null);
                    if (name) names.add(name);
                }
                continue;
            }

            for (const specifier of (node.specifiers as ASTNode[] | undefined) ?? []) {
                if (specifier.type !== "ExportSpecifier") continue;
                const name = getIdentifierName(specifier.local as ASTNode);
                if (name) names.add(name);
            }
            continue;
        }

        if (node.type === "ExportDefaultDeclaration") {
            const declaration = node.declaration as ASTNode | null;
            const name = getIdentifierName(declaration) || getIdentifierName((declaration?.id as ASTNode | null) ?? null);
            if (name) names.add(name);
        }
    }

    return names;
}
