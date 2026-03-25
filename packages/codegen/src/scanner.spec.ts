import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { scan } from "./scanner/index";

async function scanFixture(files: Record<string, string>) {
    const dir = mkdtempSync(join(tmpdir(), "electro-codegen-scan-"));

    try {
        for (const [name, content] of Object.entries(files)) {
            writeFileSync(join(dir, name), content);
        }

        return await scan(dir);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

function expectDefined<T>(value: T | undefined): T {
    expect(value).toBeDefined();
    return value!;
}

describe("scan()", () => {
    it("discovers decorated modules with methods, jobs, and signal handlers", async () => {
        const result = await scanFixture({
            "workspace.ts": `
                @Injectable()
                export class WorkspaceState {
                    @query()
                    getSession() {}
                }

                @Injectable()
                export class WorkspaceService {
                    @query()
                    getActiveProject() {}

                    @command()
                    async openProject(projectId: string) {}

                    @job({ id: "sync-projects", cron: "*/5 * * * *" })
                    async syncProjects() {}

                    @signal({ id: "projectOpened" })
                    onProjectOpened(payload: { projectId: string }) {}
                }

                @Module({
                    providers: [WorkspaceState, WorkspaceService],
                })
                export class WorkspaceModule {
                    @command()
                    async bootstrapWorkspace() {}
                }
            `,
        });

        expect(result.modules).toHaveLength(1);

        const workspace = expectDefined(result.modules[0]);
        expect(workspace.id).toBe("workspace");
        expect(workspace.className).toBe("WorkspaceModule");
        expect(workspace.exported).toBe(true);

        // Module's own methods
        expect(workspace.methods).toEqual([
            expect.objectContaining({
                id: "bootstrapWorkspace",
                methodName: "bootstrapWorkspace",
                kind: "command",
                ownerClassName: "WorkspaceModule",
            }),
        ]);

        // Providers
        expect(workspace.providers).toHaveLength(2);
        expect(workspace.providers.map((p) => p.className)).toEqual(["WorkspaceState", "WorkspaceService"]);

        // Provider methods
        const wsService = workspace.providers.find((p) => p.className === "WorkspaceService")!;
        expect(wsService.methods.map((m) => `${m.kind}:${m.id}`)).toEqual(["query:getActiveProject", "command:openProject"]);

        // Provider jobs
        expect(wsService.jobs).toEqual([
            expect.objectContaining({
                id: "sync-projects",
                methodName: "syncProjects",
                ownerClassName: "WorkspaceService",
                cron: "*/5 * * * *",
            }),
        ]);

        // Provider signals
        expect(wsService.signals).toEqual([
            expect.objectContaining({
                id: "projectOpened",
                methodName: "onProjectOpened",
                ownerClassName: "WorkspaceService",
            }),
        ]);
    });

    it("resolves module imports to module IDs", async () => {
        const result = await scanFixture({
            "modules.ts": `
                @Module()
                export class AuthModule {}

                @Module({ imports: [AuthModule] })
                export class WorkspaceModule {}
            `,
        });

        const auth = result.modules.find((m) => m.id === "auth");
        const workspace = result.modules.find((m) => m.id === "workspace");

        expect(auth?.imports).toEqual([]);
        expect(workspace?.imports).toEqual(["auth"]);
    });

    it("derives module ID from class name by stripping Module suffix", async () => {
        const result = await scanFixture({
            "module.ts": `
                @Module({ id: "custom-id" })
                export class MyModule {}
            `,
        });

        expect(expectDefined(result.modules[0]).id).toBe("custom-id");
    });

    it("derives method ID from decorator option or method name", async () => {
        const result = await scanFixture({
            "module.ts": `
                @Module()
                export class TestModule {
                    @command({ id: "custom-command" })
                    myMethod() {}

                    @query()
                    myQuery() {}
                }
            `,
        });

        const module = expectDefined(result.modules[0]);
        expect(expectDefined(module.methods[0]).id).toBe("custom-command");
        expect(expectDefined(module.methods[0]).methodName).toBe("myMethod");
        expect(expectDefined(module.methods[1]).id).toBe("myQuery");
        expect(expectDefined(module.methods[1]).methodName).toBe("myQuery");
    });

    it("discovers @Window() decorated classes", async () => {
        const result = await scanFixture({
            "ui.ts": `
                @Window({ id: "main" })
                export class MainWindow {}
            `,
        });

        expect(result.windows).toEqual([
            {
                id: "main",
                className: "MainWindow",
                filePath: expect.stringContaining("/ui.ts"),
                exported: true,
            },
        ]);
    });

    it("discovers @View() decorated classes with access and signals", async () => {
        const result = await scanFixture({
            "ui.ts": `
                @View({
                    source: "view:main",
                    access: ["workspace:getActiveProject"],
                    signals: ["projectOpened"],
                })
                export class MainView {}
            `,
        });

        expect(result.views).toEqual([
            {
                id: "main",
                className: "MainView",
                filePath: expect.stringContaining("/ui.ts"),
                exported: true,
                source: "view:main",
                access: ["workspace:getActiveProject"],
                signals: ["projectOpened"],
            },
        ]);
    });

    it("skips lifecycle methods (onInit, onReady, onShutdown, onDispose)", async () => {
        const result = await scanFixture({
            "module.ts": `
                @Module()
                export class TestModule {
                    @command()
                    myCommand() {}

                    onInit() {}
                    onReady() {}
                    onShutdown() {}
                    onDispose() {}
                }
            `,
        });

        expect(expectDefined(result.modules[0]).methods).toHaveLength(1);
        expect(expectDefined(expectDefined(result.modules[0]).methods[0]).id).toBe("myCommand");
    });

    it("skips static and private methods", async () => {
        const result = await scanFixture({
            "module.ts": `
                @Module()
                export class TestModule {
                    @command()
                    publicCommand() {}

                    @command()
                    static staticCommand() {}

                    @command()
                    private privateCommand() {}
                }
            `,
        });

        expect(expectDefined(result.modules[0]).methods).toHaveLength(1);
        expect(expectDefined(expectDefined(result.modules[0]).methods[0]).id).toBe("publicCommand");
    });

    it("marks non-exported classes correctly", async () => {
        const result = await scanFixture({
            "module.ts": `
                @Module()
                class InternalModule {
                    @command()
                    doSomething() {}
                }
            `,
        });

        expect(expectDefined(result.modules[0]).exported).toBe(false);
    });

    it("warns on @Window() with non-literal id", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        const result = await scanFixture({
            "ui.ts": `
                const id = "main";
                @Window({ id })
                export class MainWindow {}
            `,
        });

        expect(result.windows).toHaveLength(0);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("Skipping @Window()"));
    });

    it("warns on external @View() with non-literal id", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        const result = await scanFixture({
            "ui.ts": `
                const id = "main";
                @View({ id, source: "file:./index.html" })
                export class MainView {}
            `,
        });

        expect(result.views).toHaveLength(0);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("Skipping @View()"));
    });

    it("excludes .d.ts, .test.ts, .spec.ts, .gen.ts files", async () => {
        const result = await scanFixture({
            "module.ts": `
                @Module()
                export class RealModule {}
            `,
            "module.d.ts": `
                @Module()
                export class DeclarationModule {}
            `,
            "module.test.ts": `
                @Module()
                export class TestModule {}
            `,
            "module.gen.ts": `
                @Module()
                export class GeneratedModule {}
            `,
        });

        expect(result.modules).toHaveLength(1);
        expect(expectDefined(result.modules[0]).className).toBe("RealModule");
    });

    it("supports legacy 'services' and 'dependsOn' keys", async () => {
        const result = await scanFixture({
            "workspace.ts": `
                @Injectable()
                export class WorkspaceService {
                    @command()
                    doWork() {}
                }

                @Module()
                export class AuthModule {}

                @Module({
                    services: [WorkspaceService],
                    dependsOn: [AuthModule],
                })
                export class WorkspaceModule {}
            `,
        });

        const workspace = expectDefined(result.modules.find((m) => m.id === "workspace"));
        expect(workspace.providers).toHaveLength(1);
        expect(expectDefined(workspace.providers[0]).className).toBe("WorkspaceService");
        expect(workspace.imports).toEqual(["auth"]);
    });
});
