#!/usr/bin/env tsx

/**
 * Publish script — builds, tests, and publishes all packages to npm in dependency order.
 *
 * Uses `pnpm publish` which automatically resolves `workspace:*` references
 * to real version numbers in the published tarball.
 *
 * Usage:
 *   tsx scripts/publish.ts            # publish all packages
 *   tsx scripts/publish.ts --dry-run  # preview without publishing
 *
 * Prerequisites:
 *   - Clean git working directory
 *   - Logged into npm: pnpm login
 *   - Or set NPM_TOKEN env var
 */

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

/** Packages in dependency order (leaf → dependents). */
const PACKAGES = ["packages/common", "packages/config", "packages/renderer", "packages/runtime", "packages/codegen", "packages/cli"] as const;

function run(cmd: string[], opts?: { cwd?: string }): void {
    const [command, ...args] = cmd;
    const cwd = opts?.cwd ?? root;
    console.log(`  $ ${cmd.join(" ")}${cwd !== root ? ` (in ${cwd})` : ""}`);
    const result = spawnSync(command!, args, { cwd, stdio: "inherit" });
    if (result.status !== 0) {
        console.error(`\nCommand failed with exit code ${result.status ?? "unknown"}: ${cmd.join(" ")}`);
        process.exit(1);
    }
}

function gitIsClean(): boolean {
    const result = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf-8" });
    return result.stdout.trim() === "";
}

// ── Main ──

const dryRun = process.argv.includes("--dry-run");

console.log(`\n📦 Publishing packages${dryRun ? " (dry run)" : ""}\n`);

// 1. Check clean working directory
if (!dryRun && !gitIsClean()) {
    console.error("Error: git working directory is not clean. Commit or stash changes first.");
    process.exit(1);
}

// 2. Build all packages
console.log("Building...\n");
run(["pnpm", "run", "build"]);

// 3. Run tests
console.log("\nRunning tests...\n");
run(["pnpm", "run", "test"]);

// 4. Publish in dependency order
console.log("\nPublishing...\n");
for (const pkg of PACKAGES) {
    const cwd = resolve(root, pkg);
    const cmd = ["pnpm", "publish", "--access", "public", "--no-git-checks"];
    if (dryRun) cmd.push("--dry-run");
    run(cmd, { cwd });
    console.log("");
}

console.log("Done!\n");
