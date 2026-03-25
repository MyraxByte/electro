import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const TESTS_DIR = import.meta.dirname;
const PACKAGE_ROOT = join(TESTS_DIR, "..");
const SRC_DIR = join(PACKAGE_ROOT, "src");

const EXCLUDED_FILES = new Set(["index.ts", "expect-electro-error.ts"]);
const EXCLUDED_PATTERNS = ["/types/", "/errors/", "/metadata/keys.ts"];

function walk(dir: string): string[] {
    const result: string[] = [];

    for (const entry of readdirSync(dir)) {
        const fullPath = join(dir, entry);
        const stats = statSync(fullPath);

        if (stats.isDirectory()) {
            result.push(...walk(fullPath));
            continue;
        }

        result.push(fullPath);
    }

    return result;
}

function shouldHaveSpec(filePath: string): boolean {
    const fileName = basename(filePath);

    if (!filePath.endsWith(".ts")) {
        return false;
    }

    if (filePath.endsWith(".spec.ts")) {
        return false;
    }

    if (filePath.endsWith(".d.ts")) {
        return false;
    }

    if (EXCLUDED_FILES.has(fileName)) {
        return false;
    }

    if (EXCLUDED_PATTERNS.some((pattern) => filePath.includes(pattern))) {
        return false;
    }

    return true;
}

function getExpectedSpecPath(sourcePath: string): string {
    const relativeSourcePath = relative(SRC_DIR, sourcePath);
    const ext = extname(relativeSourcePath);
    const fileNameWithoutExt = relativeSourcePath.slice(0, -ext.length);

    return join(TESTS_DIR, `${fileNameWithoutExt}.spec.ts`);
}

describe("test structure", () => {
    it("ensures every required source file has a mirrored spec file in tests/", () => {
        const allFiles = walk(SRC_DIR);
        const sourceFiles = allFiles.filter(shouldHaveSpec);

        const missingSpecs = sourceFiles.filter((sourceFile) => {
            const specFile = getExpectedSpecPath(sourceFile);
            return !existsSync(specFile);
        });

        expect(missingSpecs).toEqual([]);
    });
});
