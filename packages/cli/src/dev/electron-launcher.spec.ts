import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findElectronBin } from "./electron-launcher";

async function createFile(path: string, content = ""): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
}

describe("findElectronBin()", () => {
    const rootsToCleanup = new Set<string>();

    afterEach(async () => {
        for (const root of rootsToCleanup) {
            await import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true }));
        }
        rootsToCleanup.clear();
    });

    it("falls back to later search roots when the app root does not install electron", async () => {
        const tempRoot = resolve(process.cwd(), ".tmp-electron-launcher");
        const appRoot = resolve(tempRoot, "app");
        const runtimeRoot = resolve(tempRoot, "packages/runtime");
        rootsToCleanup.add(tempRoot);

        const electronBin = resolve(runtimeRoot, "node_modules/.bin/electron");
        await createFile(electronBin);

        await expect(findElectronBin([appRoot, runtimeRoot])).resolves.toBe(electronBin);
    });

    it("resolves the packaged electron binary from path.txt", async () => {
        const tempRoot = resolve(process.cwd(), ".tmp-electron-launcher-path-txt");
        const runtimeRoot = resolve(tempRoot, "packages/runtime");
        rootsToCleanup.add(tempRoot);

        await createFile(resolve(runtimeRoot, "node_modules/electron/path.txt"), "electron-bin");
        const expected = resolve(runtimeRoot, "node_modules/electron/dist/electron-bin");
        await createFile(expected);

        await expect(findElectronBin([runtimeRoot])).resolves.toBe(expected);
    });
});
