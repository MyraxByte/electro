import { mkdtemp, mkdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/dev/config-loader";

const tempDirs: string[] = [];

async function createTempDir(prefix: string): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
}

async function writeText(filePath: string, content: string): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, content);
}

async function real(filePath: string): Promise<string> {
    return realpath(filePath);
}

afterEach(async () => {
    await Promise.all(
        tempDirs.splice(0).map(async (dir) => {
            await rm(dir, { recursive: true, force: true });
        }),
    );
});

describe("loadConfig()", () => {
    it("resolves runtime and view configs from explicit path-like specifiers", async () => {
        const root = await createTempDir("electro-cli-single-");

        await writeText(join(root, "electro.config.ts"), `export default { runtime: "./runtime", views: ["./renderer/views/main"] };`);
        await writeText(join(root, "runtime/runtime.config.ts"), `export default { entry: "./src/main.ts", resolve: { alias: { "@runtime": "./src" } } };`);
        await writeText(join(root, "runtime/src/main.ts"), `export {};`);
        await writeText(
            join(root, "renderer/views/main/view.config.ts"),
            `export default { viewId: "main", entry: "./index.html", define: { __TEST__: "true" } };`,
        );
        await writeText(join(root, "renderer/views/main/index.html"), "<!doctype html><html></html>");

        const loaded = await loadConfig(join(root, "electro.config.ts"));

        expect(loaded.root).toBe(root);
        expect(loaded.scanDir).toBe(await real(join(root, "runtime")));
        expect(loaded.config.runtime.__source).toBe(await real(join(root, "runtime/runtime.config.ts")));
        expect(loaded.config.runtime.entry).toBe("./src/main.ts");
        expect(loaded.config.runtime.userConfig).toMatchObject({
            resolve: { alias: { "@runtime": "./src" } },
        });
        expect(loaded.views).toHaveLength(1);
        expect(loaded.views[0]).toMatchObject({
            id: "main",
            __source: await real(join(root, "renderer/views/main/view.config.ts")),
            entry: "./index.html",
        });
        expect(loaded.views[0]?.userConfig).toMatchObject({
            define: { __TEST__: "true" },
        });
    });

    it("resolves runtime and view packages from workspace names in monorepo mode", async () => {
        const root = await createTempDir("electro-cli-workspace-");

        await writeText(
            join(root, "package.json"),
            JSON.stringify({
                private: true,
                workspaces: ["apps/*", "packages/*"],
            }),
        );
        await writeText(
            join(root, "apps/desktop/electro.config.ts"),
            `export default {
                runtime: "@myapp/core",
                views: ["@myapp/view-main"]
            };`,
        );
        await writeText(join(root, "packages/core/package.json"), JSON.stringify({ name: "@myapp/core" }));
        await writeText(join(root, "packages/core/runtime.config.ts"), `export default { entry: "./src/main.ts", define: { __RUNTIME__: "yes" } };`);
        await writeText(join(root, "packages/core/src/main.ts"), `export {};`);
        await writeText(join(root, "packages/view-main/package.json"), JSON.stringify({ name: "@myapp/view-main" }));
        await writeText(join(root, "packages/view-main/view.config.ts"), `export default { viewId: "main", entry: "./index.html", plugins: [] };`);
        await writeText(join(root, "packages/view-main/index.html"), "<!doctype html><html></html>");

        const loaded = await loadConfig(join(root, "apps/desktop/electro.config.ts"));

        expect(loaded.config.runtime.__source).toBe(await real(join(root, "packages/core/runtime.config.ts")));
        expect(loaded.scanDir).toBe(await real(join(root, "packages/core")));
        expect(loaded.config.runtime.userConfig).toMatchObject({
            define: { __RUNTIME__: "yes" },
        });
        expect(loaded.views).toHaveLength(1);
        expect(loaded.views[0]).toMatchObject({
            id: "main",
            __source: await real(join(root, "packages/view-main/view.config.ts")),
            entry: "./index.html",
        });
    });

    it("resolves runtime and view packages from installed node_modules packages", async () => {
        const root = await createTempDir("electro-cli-installed-");

        await writeText(
            join(root, "electro.config.ts"),
            `export default {
                runtime: "@myapp/core",
                views: ["@myapp/view-main"]
            };`,
        );
        await writeText(join(root, "node_modules/@myapp/core/package.json"), JSON.stringify({ name: "@myapp/core" }));
        await writeText(join(root, "node_modules/@myapp/core/runtime.config.ts"), `export default { entry: "./src/main.ts" };`);
        await writeText(join(root, "node_modules/@myapp/core/src/main.ts"), `export {};`);
        await writeText(join(root, "node_modules/@myapp/view-main/package.json"), JSON.stringify({ name: "@myapp/view-main" }));
        await writeText(join(root, "node_modules/@myapp/view-main/view.config.ts"), `export default { viewId: "main", entry: "./index.html" };`);
        await writeText(join(root, "node_modules/@myapp/view-main/index.html"), "<!doctype html><html></html>");

        const loaded = await loadConfig(join(root, "electro.config.ts"));

        expect(loaded.config.runtime.__source).toBe(await real(join(root, "node_modules/@myapp/core/runtime.config.ts")));
        expect(loaded.views).toHaveLength(1);
        expect(loaded.views[0]).toMatchObject({
            id: "main",
            __source: await real(join(root, "node_modules/@myapp/view-main/view.config.ts")),
            entry: "./index.html",
        });
    });
});
