#!/usr/bin/env tsx

import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const docsRoot = resolve(root, "docs");
const versionsRoot = resolve(docsRoot, "versions");
const siteUrl = "https://electrojs.myraxbyte.dev";
const releasesUrl = "https://github.com/MyraxByte/electrojs/releases";
const SNAPSHOT_ENTRIES = ["index.md", "guide", "core", "ui", "advanced"] as const;

interface SnapshotOptions {
    readonly dryRun?: boolean;
}

function assertSemver(version: string): void {
    if (!/^\d+\.\d+\.\d+$/.test(version)) {
        throw new Error(`Invalid version "${version}". Expected x.y.z.`);
    }
}

export function versionLineFromVersion(version: string): string {
    assertSemver(version);
    const [major, minor] = version.split(".");
    return `v${major}.${minor}`;
}

function normalizeRoute(route: string): string {
    if (route === "/") return route;
    return route.endsWith("/") ? route.slice(0, -1) : route;
}

async function collectMarkdownFiles(dir: string): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
            files.push(...(await collectMarkdownFiles(fullPath)));
            continue;
        }

        if (entry.isFile() && entry.name.endsWith(".md")) {
            files.push(fullPath);
        }
    }

    return files;
}

async function collectDocRoutes(): Promise<Set<string>> {
    const routes = new Set<string>();

    for (const entry of SNAPSHOT_ENTRIES) {
        const fullPath = join(docsRoot, entry);

        if (!existsSync(fullPath)) {
            continue;
        }

        if (entry.endsWith(".md")) {
            routes.add(entry === "index.md" ? "/" : `/${entry.replace(/\.md$/, "")}`);
            continue;
        }

        for (const filePath of await collectMarkdownFiles(fullPath)) {
            const docPath = relative(docsRoot, filePath).replaceAll("\\", "/");
            routes.add(`/${docPath.replace(/\.md$/, "")}`);
        }
    }

    return routes;
}

function rewriteRoute(pathname: string, versionLine: string, routes: ReadonlySet<string>): string {
    const normalized = normalizeRoute(pathname);
    if (!routes.has(normalized)) {
        return pathname;
    }

    return normalized === "/" ? `/versions/${versionLine}/` : `/versions/${versionLine}${normalized}`;
}

function rewriteVersionedLinks(content: string, versionLine: string, routes: ReadonlySet<string>): string {
    const rewritePath = (pathname: string) => rewriteRoute(pathname, versionLine, routes);

    const markdownLinks = content.replace(/\]\((\/[^)\s?#]*)([?#][^)]+)?\)/g, (match, pathname: string, suffix = "") => {
        const rewritten = rewritePath(pathname);
        return rewritten === pathname ? match : `](${rewritten}${suffix})`;
    });

    return markdownLinks.replace(
        /^(\s*link:\s*)(["']?)(\/[^\s"'#?]*)([?#][^\s"']+)?\2(\s*)$/gm,
        (match, prefix: string, quote: string, pathname: string, suffix = "", trailing: string) => {
            const rewritten = rewritePath(pathname);
            return rewritten === pathname ? match : `${prefix}${quote}${rewritten}${suffix}${quote}${trailing}`;
        },
    );
}

function compareVersionLinesDesc(left: string, right: string): number {
    const [leftMajor, leftMinor] = left.slice(1).split(".").map(Number);
    const [rightMajor, rightMinor] = right.slice(1).split(".").map(Number);

    if (leftMajor !== rightMajor) {
        return rightMajor - leftMajor;
    }

    return rightMinor - leftMinor;
}

async function writeVersionsIndex(versionLines: readonly string[], options: SnapshotOptions): Promise<void> {
    const indexPath = join(versionsRoot, "index.md");
    const latestLine = "- [latest](/guide/introduction) — current stable documentation";
    const versionLinesMarkdown = versionLines.map(
        (versionLine) => `- [${versionLine}](/versions/${versionLine}/guide/introduction) — snapshot for the ${versionLine.slice(1)} release line`,
    );

    const content = `---
title: Documentation Versions
description: Versioned documentation snapshots for ElectroJS release lines
---

# Documentation Versions

Use \`latest\` for the current stable API reference and implementation guidance.
Use version snapshots when you need the docs that matched a released API surface.

${[latestLine, ...versionLinesMarkdown].join("\n")}

Release notes for every published tag live in [GitHub Releases](${releasesUrl}).
`;

    if (options.dryRun) {
        console.log(`  [dry-run] write ${relative(root, indexPath)}`);
        return;
    }

    await writeFile(indexPath, content);
}

export async function snapshotDocs(version: string, options: SnapshotOptions = {}): Promise<string> {
    const versionLine = versionLineFromVersion(version);
    const targetRoot = join(versionsRoot, versionLine);
    const routes = await collectDocRoutes();

    if (options.dryRun) {
        console.log(`  [dry-run] snapshot docs -> ${relative(root, targetRoot)}`);
    } else {
        await mkdir(versionsRoot, { recursive: true });
        await rm(targetRoot, { recursive: true, force: true });
        await mkdir(targetRoot, { recursive: true });

        for (const entry of SNAPSHOT_ENTRIES) {
            const source = join(docsRoot, entry);
            if (!existsSync(source)) {
                continue;
            }

            await cp(source, join(targetRoot, entry), { recursive: true });
        }

        for (const filePath of await collectMarkdownFiles(targetRoot)) {
            const content = await readFile(filePath, "utf8");
            await writeFile(filePath, rewriteVersionedLinks(content, versionLine, routes));
        }
    }

    const versionLines = existsSync(versionsRoot)
        ? (await readdir(versionsRoot, { withFileTypes: true }))
              .filter((entry) => entry.isDirectory() && /^v\d+\.\d+$/.test(entry.name))
              .map((entry) => entry.name)
              .sort(compareVersionLinesDesc)
        : [versionLine];

    await writeVersionsIndex(versionLines, options);

    console.log(`  ✓ docs snapshot ${versionLine} (${siteUrl}/versions/${versionLine}/)`);
    return versionLine;
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const dryRun = args.includes("--dry-run");
    const version = args.find((arg) => arg !== "--dry-run");

    if (!version) {
        console.error("Usage: tsx scripts/version-docs.ts <x.y.z> [--dry-run]");
        process.exit(1);
    }

    await snapshotDocs(version, { dryRun });
}

if (import.meta.url === `file://${process.argv[1]}`) {
    await main();
}
