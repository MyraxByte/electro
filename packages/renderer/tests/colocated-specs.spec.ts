import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_DIR = import.meta.dirname;

const EXCLUDED_FILES = new Set(["index.ts"]);
const EXCLUDED_PATTERNS = ["/types/", "/errors/"];

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
    const dir = dirname(sourcePath);
    const ext = extname(sourcePath);
    const fileNameWithoutExt = basename(sourcePath, ext);

    return join(dir, `${fileNameWithoutExt}.spec.ts`);
}

describe("test structure", () => {
    it("ensures every required source file has a colocated spec file", () => {
        const allFiles = walk(SRC_DIR);
        const sourceFiles = allFiles.filter(shouldHaveSpec);

        const missingSpecs = sourceFiles.filter((sourceFile) => {
            const specFile = getExpectedSpecPath(sourceFile);
            return !existsSync(specFile);
        });

        expect(missingSpecs).toEqual([]);
    });
});
