#!/usr/bin/env node

import { copyFile, mkdir, readdir, rm, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const repositoryRoot = resolve(packageRoot, "../..");
const sourceRoot = resolve(repositoryRoot, "templates");
const distRoot = resolve(packageRoot, "dist");

const TEMPLATE_FILE_RENAMES = new Map([[".gitignore", "_gitignore"]]);

async function assertDirectory(path, label) {
    let info;

    try {
        info = await stat(path);
    } catch {
        throw new Error(`${label} was not found: ${path}`);
    }

    if (!info.isDirectory()) {
        throw new Error(`${label} is not a directory: ${path}`);
    }
}

async function removeSyncedTemplates() {
    const entries = await readdir(distRoot, { withFileTypes: true }).catch(() => []);

    await Promise.all(
        entries
            .filter((entry) => entry.isDirectory() && entry.name.startsWith("template-"))
            .map((entry) => rm(join(distRoot, entry.name), { force: true, recursive: true })),
    );
}

async function copyTemplateDir(sourceDir, targetDir) {
    await mkdir(targetDir, { recursive: true });

    const entries = await readdir(sourceDir, { withFileTypes: true });

    for (const entry of entries) {
        const sourcePath = join(sourceDir, entry.name);
        const targetName = TEMPLATE_FILE_RENAMES.get(entry.name) ?? entry.name;
        const targetPath = join(targetDir, targetName);

        if (entry.isDirectory()) {
            await copyTemplateDir(sourcePath, targetPath);
            continue;
        }

        if (entry.isFile()) {
            await copyFile(sourcePath, targetPath);
        }
    }
}

async function main() {
    await assertDirectory(sourceRoot, "Template source");
    await mkdir(distRoot, { recursive: true });
    await removeSyncedTemplates();

    const entries = await readdir(sourceRoot, { withFileTypes: true });

    for (const entry of entries) {
        if (!entry.isDirectory()) {
            continue;
        }

        await copyTemplateDir(join(sourceRoot, entry.name), join(distRoot, `template-${entry.name}`));
    }
}

await main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
});
