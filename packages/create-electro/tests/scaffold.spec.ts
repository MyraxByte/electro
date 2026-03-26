import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { scaffoldProject } from "../src/scaffold";

const createdDirs: string[] = [];

afterEach(async () => {
    await Promise.all(createdDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("scaffoldProject", () => {
    it("creates a monorepo ElectroJS starter", async () => {
        const root = await mkdtemp(join(tmpdir(), "create-electro-"));
        createdDirs.push(root);

        const projectDir = join(root, "my-notes-app");
        const createdFiles = await scaffoldProject({
            projectDir,
            template: "monorepo",
        });

        expect(createdFiles).toContain(join(projectDir, "electro.config.ts"));
        expect(createdFiles).toContain(join(projectDir, "runtime", "src", "modules", "notes", "notes.service.ts"));
        expect(createdFiles).toContain(join(projectDir, "views", "main", "electro-env.d.ts"));

        const appConfig = await readFile(join(projectDir, "electro.config.ts"), "utf8");
        expect(appConfig).toContain(`runtime: "runtime"`);
        expect(appConfig).toContain(`views: ["@views/main"]`);

        const rootPackageJson = await readFile(join(projectDir, "package.json"), "utf8");
        expect(rootPackageJson).toContain(`"name": "my-notes-app"`);
        expect(rootPackageJson).toContain(`"@electrojs/cli"`);

        const indexHtml = await readFile(join(projectDir, "views", "main", "index.html"), "utf8");
        expect(indexHtml).toContain("<title>My Notes App</title>");

        await expect(access(join(projectDir, ".gitignore"))).resolves.toBeUndefined();
    });

    it("refuses to write into a non-empty directory without force", async () => {
        const root = await mkdtemp(join(tmpdir(), "create-electro-"));
        createdDirs.push(root);

        await scaffoldProject({
            projectDir: root,
        });

        await expect(
            scaffoldProject({
                projectDir: root,
            }),
        ).rejects.toThrow("is not empty");
    });

    it("removes existing files when force is enabled", async () => {
        const root = await mkdtemp(join(tmpdir(), "create-electro-"));
        createdDirs.push(root);

        await writeFile(join(root, "stale.txt"), "stale", "utf8");

        await scaffoldProject({
            force: true,
            projectDir: root,
        });

        await expect(access(join(root, "stale.txt"))).rejects.toThrow();
        await expect(access(join(root, "electro.config.ts"))).resolves.toBeUndefined();
    });
});
