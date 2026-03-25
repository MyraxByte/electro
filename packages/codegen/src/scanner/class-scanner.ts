/**
 * Class-level decorator scanner.
 *
 * Extracts `@Module`, `@Injectable`, `@View`, and `@Window` decorated classes
 * from a program AST, including their method-level decorators.
 *
 * @module scanner/class-scanner
 */

import type { ScannedJob, ScannedMethod, ScannedSignal, ScannedView, ScannedWindow } from "../types";
import {
    type ASTNode,
    extractExportedNames,
    findDecorator,
    getClassName,
    getDecoratorObjectArg,
    getIdentifierArray,
    getObjectProperty,
    getStringArray,
    getStringLiteral,
} from "./ast-parser";
import { deriveModuleId, deriveViewId } from "./id-derivation";
import { scanMethods } from "./method-scanner";

// ── Raw descriptors (internal to scanner) ───────────────────────────

/** Raw module descriptor before provider resolution. */
export interface RawModuleDescriptor {
    readonly kind: "module";
    readonly id: string;
    readonly className: string;
    readonly filePath: string;
    readonly exported: boolean;
    /** Class names from `@Module({ imports })`. */
    readonly importClassNames: readonly string[];
    /** Class names from `@Module({ providers })`. */
    readonly providerClassNames: readonly string[];
    readonly methods: readonly ScannedMethod[];
    readonly signals: readonly ScannedSignal[];
    readonly jobs: readonly ScannedJob[];
}

/** Raw injectable descriptor before being attached to a module. */
export interface RawProviderDescriptor {
    readonly kind: "injectable";
    readonly className: string;
    readonly filePath: string;
    readonly exported: boolean;
    readonly methods: readonly ScannedMethod[];
    readonly signals: readonly ScannedSignal[];
    readonly jobs: readonly ScannedJob[];
}

/** Result of scanning a single file for decorated classes. */
export interface FileScanResult {
    readonly modules: readonly RawModuleDescriptor[];
    readonly providers: readonly RawProviderDescriptor[];
    readonly windows: readonly ScannedWindow[];
    readonly views: readonly ScannedView[];
}

/**
 * Scan a parsed AST program for all Electro-decorated classes.
 *
 * Returns raw descriptors that need further processing (provider resolution,
 * dependency linking) by the top-level scanner.
 */
export function scanFileClasses(program: ASTNode, filePath: string): FileScanResult {
    const exportedNames = extractExportedNames(program);
    const modules: RawModuleDescriptor[] = [];
    const providers: RawProviderDescriptor[] = [];
    const windows: ScannedWindow[] = [];
    const views: ScannedView[] = [];

    const body = program.body as ASTNode[] | undefined;
    if (!body) return { modules, providers, windows, views };

    // Walk top-level statements looking for class declarations.
    // Also handle `export class Foo {}` (ExportNamedDeclaration wrapping ClassDeclaration).
    for (const node of body) {
        let classNode: ASTNode | null = null;

        if (node.type === "ClassDeclaration") {
            classNode = node;
        } else if (node.type === "ExportNamedDeclaration" && node.declaration?.type === "ClassDeclaration") {
            classNode = node.declaration;
        } else if (node.type === "ExportDefaultDeclaration" && node.declaration?.type === "ClassDeclaration") {
            classNode = node.declaration;
        }

        if (!classNode) continue;

        const className = getClassName(classNode);
        if (!className) continue;

        const exported = exportedNames.has(className);

        // @Module()
        if (findDecorator(classNode, "Module")) {
            const config = getDecoratorObjectArg(classNode, "Module");
            const explicitId = getStringLiteral(config ? getObjectProperty(config, "id") : null);
            const importClassNames = [
                ...getIdentifierArray(config ? getObjectProperty(config, "imports") : null),
                ...getIdentifierArray(config ? getObjectProperty(config, "dependsOn") : null),
            ];
            const providerClassNames = [
                ...getIdentifierArray(config ? getObjectProperty(config, "providers") : null),
                ...getIdentifierArray(config ? getObjectProperty(config, "services") : null),
            ];
            const { methods, signals, jobs } = scanMethods(classNode, className);

            modules.push({
                kind: "module",
                id: deriveModuleId(className, explicitId),
                className,
                filePath,
                exported,
                importClassNames: [...new Set(importClassNames)],
                providerClassNames: [...new Set(providerClassNames)],
                methods,
                signals,
                jobs,
            });
            continue;
        }

        // @Injectable()
        if (findDecorator(classNode, "Injectable")) {
            const { methods, signals, jobs } = scanMethods(classNode, className);

            providers.push({
                kind: "injectable",
                className,
                filePath,
                exported,
                methods,
                signals,
                jobs,
            });
            continue;
        }

        // @Window()
        if (findDecorator(classNode, "Window")) {
            const { methods, signals, jobs } = scanMethods(classNode, className);
            const config = getDecoratorObjectArg(classNode, "Window");
            const id = getStringLiteral(config ? getObjectProperty(config, "id") : null);

            if (!id) {
                console.warn(`[codegen] Skipping @Window() with non-literal id in ${filePath}`);
                continue;
            }

            providers.push({
                kind: "injectable",
                className,
                filePath,
                exported,
                methods,
                signals,
                jobs,
            });

            windows.push({ id, className, filePath, exported });
            continue;
        }

        // @View()
        if (findDecorator(classNode, "View")) {
            const { methods, signals, jobs } = scanMethods(classNode, className);
            const config = getDecoratorObjectArg(classNode, "View");
            const source = getStringLiteral(config ? getObjectProperty(config, "source") : null);

            if (!source) {
                console.warn(`[codegen] Skipping @View() with non-literal source in ${filePath}`);
                continue;
            }

            const explicitId = getStringLiteral(config ? getObjectProperty(config, "id") : null);
            const id = deriveViewId(source, explicitId);

            if (!id) {
                console.warn(`[codegen] Skipping @View() with non-literal id in ${filePath}`);
                continue;
            }

            providers.push({
                kind: "injectable",
                className,
                filePath,
                exported,
                methods,
                signals,
                jobs,
            });

            views.push({
                id,
                className,
                filePath,
                exported,
                source,
                access: getStringArray(config ? getObjectProperty(config, "access") : null),
                signals: getStringArray(config ? getObjectProperty(config, "signals") : null),
            });
        }
    }

    return { modules, providers, windows, views };
}
