import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { scaffoldProject } from "../src/scaffold";

const createdDirs: string[] = [];

afterEach(async () => {
    await Promise.all(createdDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("scaffoldProject", () => {
    it("creates a monorepo Electro starter", async () => {
        const root = await mkdtemp(join(tmpdir(), "create-electro-"));
        createdDirs.push(root);

        const projectDir = join(root, "my-notes-app");
        const createdFiles = await scaffoldProject({
            force: false,
            projectDir,
            projectName: "my-notes-app",
        });

        expect(createdFiles).toContain(join(projectDir, "electro.config.ts"));
        expect(createdFiles).toContain(join(projectDir, "runtime", "src", "modules", "notes", "notes.service.ts"));
        expect(createdFiles).toContain(join(projectDir, "views", "main", "electro-env.d.ts"));

        const appConfig = await readFile(join(projectDir, "electro.config.ts"), "utf8");
        expect(appConfig).toContain(`runtime: "runtime"`);
        expect(appConfig).toContain(`views: ["@views/main"]`);

        const rootPackageJson = await readFile(join(projectDir, "package.json"), "utf8");
        expect(rootPackageJson).toContain(`"name": "my-notes-app"`);
        expect(rootPackageJson).toContain(`"@electro/cli": "2.0.0"`);
    });

    it("refuses to write into a non-empty directory without force", async () => {
        const root = await mkdtemp(join(tmpdir(), "create-electro-"));
        createdDirs.push(root);

        await scaffoldProject({
            force: false,
            projectDir: root,
            projectName: "starter",
        });

        await expect(
            scaffoldProject({
                force: false,
                projectDir: root,
                projectName: "starter",
            }),
        ).rejects.toThrow("is not empty");
    });
});
