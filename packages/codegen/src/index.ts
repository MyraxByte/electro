/**
 * `@electro/codegen` — AST scanner and code generator for the Electro framework.
 *
 * Two-stage pipeline:
 * 1. `scan(basePath)` — discovers Electro decorators via OXC AST parsing
 * 2. `generate(input)` — produces preload scripts, runtime registry, and package-local env types
 *
 * @example
 * ```ts
 * import { scan, generate } from "@electro/codegen";
 *
 * const scanResult = await scan("./src");
 * const output = generate({ scanResult, outputDir: ".electro", srcDir: "./src" });
 * ```
 *
 * @packageDocumentation
 */

// ── Functions ────────────────────────────────────────────────────────

export { scan } from "./scanner/index";
export { generate } from "./generator/index";

// ── Error classes ────────────────────────────────────────────────────

export { CodegenError, ValidationError } from "./errors";

// ── Types ────────────────────────────────────────────────────────────

export type {
    CodegenDiagnostic,
    GeneratedFile,
    GeneratorInput,
    GeneratorOutput,
    GeneratorViewDefinition,
    PackageTypeOutput,
    PackageTypeTarget,
    ScannedJob,
    ScannedMethod,
    ScannedModule,
    ScannedProvider,
    ScannedSignal,
    ScannedView,
    ScannedWindow,
    ScanResult,
} from "./types";
