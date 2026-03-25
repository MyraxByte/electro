/**
 * Error types for `@electrojs/codegen`.
 *
 * @module errors
 */

import type { CodegenDiagnostic } from "./types";

/** Base error class for codegen operations. */
export class CodegenError extends Error {
    readonly code: string;

    constructor(message: string, code: string) {
        super(message);
        this.name = "CodegenError";
        this.code = code;
    }
}

/**
 * Thrown when the generator detects validation issues in the scan result.
 *
 * Contains an array of {@link CodegenDiagnostic} entries describing each issue.
 */
export class ValidationError extends CodegenError {
    readonly diagnostics: readonly CodegenDiagnostic[];

    constructor(diagnostics: readonly CodegenDiagnostic[]) {
        super(diagnostics.map((d) => d.message).join("\n"), "VALIDATION_ERROR");
        this.name = "ValidationError";
        this.diagnostics = diagnostics;
    }
}
