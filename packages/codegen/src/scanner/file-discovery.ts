/**
 * File discovery for the codegen scanner.
 *
 * Uses `tinyglobby` to find TypeScript source files, filtering out
 * declaration files, test files, generated files, and system artifacts.
 *
 * @module scanner/file-discovery
 */

import { basename } from "node:path";

/** File patterns to exclude from scanning. */
const EXCLUDE_PATTERNS = [/\.d\.ts$/, /\.test\.ts$/, /\.spec\.ts$/, /\.gen\.ts$/];

function shouldInclude(filePath: string): boolean {
    const name = basename(filePath);

    // macOS metadata files
    if (name.startsWith("._")) return false;
    if (filePath.includes("/__MACOSX/")) return false;

    return filePath.endsWith(".ts") && !EXCLUDE_PATTERNS.some((pattern) => pattern.test(filePath));
}

/**
 * Discover all scannable TypeScript files under `basePath`.
 *
 * Excludes: `.d.ts`, `.test.ts`, `.spec.ts`, `.gen.ts`, `node_modules/`,
 * macOS artifacts (`__MACOSX/`, `._*`).
 *
 * @returns Absolute file paths, sorted for deterministic output.
 */
export async function discoverFiles(basePath: string): Promise<string[]> {
    const { glob } = await import("tinyglobby");

    const paths = await glob(["**/*.ts"], {
        cwd: basePath,
        absolute: true,
        ignore: ["node_modules/**", "**/__MACOSX/**", "**/.DS_Store", "**/._*"],
    });

    return paths.filter(shouldInclude).sort();
}
