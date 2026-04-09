import { describe, expect, it, vi } from "vitest";
import { ValidationError } from "./errors";
import { generate } from "./generator/index";
import type { GeneratorInput, GeneratorViewDefinition, ScannedModule, ScannedSignal, ScannedView, ScannedWindow, ScanResult } from "./types";

// ── Factory functions ───────────────────────────────────────────────

function makeSignal(id: string, methodName: string, ownerClassName: string): ScannedSignal {
    return {
        id,
        methodName,
        ownerClassName,
        source: "decorator",
        payload: {
            kind: "method-parameter",
            parameterIndex: 0,
        },
    };
}

function makeWorkspaceModule(): ScannedModule {
    return {
        id: "workspace",
        className: "WorkspaceModule",
        filePath: "/project/src/modules/workspace/workspace.module.ts",
        exported: true,
        imports: [],
        providers: [
            {
                className: "WorkspaceState",
                filePath: "/project/src/modules/workspace/workspace.state.ts",
                exported: true,
                methods: [
                    {
                        id: "getSession",
                        methodName: "getSession",
                        kind: "query",
                        ownerClassName: "WorkspaceState",
                    },
                ],
                jobs: [],
                signals: [],
            },
            {
                className: "WorkspaceService",
                filePath: "/project/src/modules/workspace/workspace.service.ts",
                exported: true,
                methods: [
                    {
                        id: "getActiveProject",
                        methodName: "getActiveProject",
                        kind: "query",
                        ownerClassName: "WorkspaceService",
                    },
                    {
                        id: "openProject",
                        methodName: "openProject",
                        kind: "command",
                        ownerClassName: "WorkspaceService",
                    },
                ],
                jobs: [
                    {
                        id: "sync-projects",
                        methodName: "syncProjects",
                        ownerClassName: "WorkspaceService",
                        cron: "*/5 * * * *",
                    },
                ],
                signals: [makeSignal("projectOpened", "onProjectOpened", "WorkspaceService")],
            },
        ],
        methods: [],
        signals: [],
        jobs: [],
    };
}

function makeAuthModule(): ScannedModule {
    return {
        id: "auth",
        className: "AuthModule",
        filePath: "/project/src/modules/auth/auth.module.ts",
        exported: true,
        imports: [],
        providers: [],
        methods: [
            {
                id: "getSession",
                methodName: "getSession",
                kind: "query",
                ownerClassName: "AuthModule",
            },
        ],
        jobs: [],
        signals: [makeSignal("sessionChanged", "onSessionChanged", "AuthModule")],
    };
}

function makeRuntimeWindow(id = "main"): ScannedWindow {
    return {
        id,
        className: "MainWindow",
        filePath: "/project/src/windows/main.window.ts",
        exported: true,
    };
}

function makeRuntimeView(id = "main", overrides: Partial<ScannedView> = {}): ScannedView {
    return {
        id,
        className: `${id.charAt(0).toUpperCase()}${id.slice(1)}View`,
        filePath: `/project/src/views/${id}.view.ts`,
        exported: true,
        source: `view:${id}`,
        access: ["workspace:getActiveProject"],
        signals: ["projectOpened"],
        ...overrides,
    };
}

function makeScanResult(overrides: Partial<ScanResult> = {}): ScanResult {
    const modules = overrides.modules ?? [makeAuthModule(), { ...makeWorkspaceModule(), imports: ["auth"] }];
    return {
        modules,
        windows: overrides.windows ?? [makeRuntimeWindow()],
        views: overrides.views ?? [makeRuntimeView()],
    };
}

function makeInput(overrides: Partial<GeneratorInput> = {}): GeneratorInput {
    return {
        scanResult: makeScanResult(),
        outputDir: "/project/.electro",
        srcDir: "/project/src",
        ...overrides,
    };
}

// ── Tests ───────────────────────────────────────────────────────────

describe("generate()", () => {
    it("generates preload files and package-local renderer env types for each view", () => {
        const view: GeneratorViewDefinition = {
            id: "main",
            preload: "./renderer/preload.ts",
            __source: "/project/src/renderer/views/main/view.config.ts",
        };

        const { files, packageTypes } = generate(
            makeInput({
                views: [view],
                packageTargets: [
                    {
                        packageRoot: "/project/views/main",
                        viewId: "main",
                    },
                ],
                scanResult: makeScanResult({
                    views: [
                        makeRuntimeView("main", {
                            access: ["workspace:getSession", "workspace:getActiveProject", "workspace:openProject", "auth:getSession"],
                            signals: ["projectOpened", "sessionChanged"],
                        }),
                    ],
                }),
            }),
        );

        const preload = files.find((file) => file.path === "generated/preload/main.gen.ts");
        const rendererEnv = packageTypes[0];

        expect(preload?.content).toContain('import { createBridgeClient } from "@electrojs/runtime/client";');
        expect(preload?.content).toContain('viewId: "main",');
        expect(files.find((file) => file.path === "generated/views/main.bridge.d.ts")).toBeUndefined();
        expect(files.find((file) => file.path === "generated/renderer-env.d.ts")).toBeUndefined();
        expect(rendererEnv?.content).toContain('declare module "@electrojs/renderer"');
        expect(rendererEnv?.content).not.toContain('declare module "@electrojs/runtime"');
        expect(rendererEnv?.content).not.toContain("_ModuleAuthoringApi");
        expect(rendererEnv?.content).not.toContain("_InvokeMethod");

        // Renderer env should contain allowed methods as BridgeContractEntry types
        expect(rendererEnv?.content).toContain(
            '"workspace:getSession": import("@electrojs/renderer").BridgeContractEntry<_BridgeInputFromMethod<typeof import("../../src/modules/workspace/workspace.state").WorkspaceState, "getSession">, _BridgeOutputFromMethod<typeof import("../../src/modules/workspace/workspace.state").WorkspaceState, "getSession">>;',
        );
        expect(rendererEnv?.content).toContain(
            '"workspace:getActiveProject": import("@electrojs/renderer").BridgeContractEntry<_BridgeInputFromMethod<typeof import("../../src/modules/workspace/workspace.service").WorkspaceService, "getActiveProject">, _BridgeOutputFromMethod<typeof import("../../src/modules/workspace/workspace.service").WorkspaceService, "getActiveProject">>;',
        );
        expect(rendererEnv?.content).toContain(
            '"workspace:openProject": import("@electrojs/renderer").BridgeContractEntry<_BridgeInputFromMethod<typeof import("../../src/modules/workspace/workspace.service").WorkspaceService, "openProject">, _BridgeOutputFromMethod<typeof import("../../src/modules/workspace/workspace.service").WorkspaceService, "openProject">>;',
        );
        expect(rendererEnv?.content).toContain(
            '"auth:getSession": import("@electrojs/renderer").BridgeContractEntry<_BridgeInputFromMethod<typeof import("../../src/modules/auth/auth.module").AuthModule, "getSession">, _BridgeOutputFromMethod<typeof import("../../src/modules/auth/auth.module").AuthModule, "getSession">>;',
        );

        // Renderer env should contain allowed signals
        expect(rendererEnv?.content).toContain(
            '"projectOpened": _SignalPayloadFromMethod<typeof import("../../src/modules/workspace/workspace.service").WorkspaceService, "onProjectOpened">;',
        );
        expect(rendererEnv?.content).toContain(
            '"sessionChanged": _SignalPayloadFromMethod<typeof import("../../src/modules/auth/auth.module").AuthModule, "onSessionChanged">;',
        );
    });

    it("generates preload with user extension import", () => {
        const view: GeneratorViewDefinition = {
            id: "main",
            preload: "./renderer/preload.ts",
            __source: "/project/src/renderer/views/main/view.config.ts",
        };

        const { files } = generate(
            makeInput({
                views: [view],
                scanResult: makeScanResult({
                    views: [makeRuntimeView("main")],
                }),
            }),
        );

        const preload = files.find((file) => file.path === "generated/preload/main.gen.ts");
        expect(preload?.content).toContain("// User preload extension");
    });

    it("fails on unknown access keys", () => {
        expect(() =>
            generate(
                makeInput({
                    scanResult: makeScanResult({
                        views: [
                            makeRuntimeView("main", {
                                access: ["workspace:missingMethod"],
                                signals: [],
                            }),
                        ],
                    }),
                }),
            ),
        ).toThrow(ValidationError);
    });

    it("fails on unknown signal keys", () => {
        expect(() =>
            generate(
                makeInput({
                    scanResult: makeScanResult({
                        views: [
                            makeRuntimeView("main", {
                                access: [],
                                signals: ["missingSignal"],
                            }),
                        ],
                    }),
                }),
            ),
        ).toThrow(ValidationError);
    });

    it("fails on duplicate module IDs", () => {
        expect(() =>
            generate(
                makeInput({
                    scanResult: makeScanResult({
                        modules: [
                            makeWorkspaceModule(),
                            {
                                ...makeWorkspaceModule(),
                                className: "WorkspaceModuleTwo",
                                filePath: "/project/src/modules/workspace/workspace-2.module.ts",
                            },
                        ],
                        views: [],
                    }),
                }),
            ),
        ).toThrow(/Duplicate module id "workspace"/);
    });

    it("merges duplicate signal IDs by priority within a module", () => {
        const { files } = generate(
            makeInput({
                scanResult: makeScanResult({
                    modules: [
                        {
                            ...makeWorkspaceModule(),
                            signals: [makeSignal("sameSignal", "handler1", "WorkspaceModule"), makeSignal("sameSignal", "handler2", "WorkspaceModule")],
                        },
                    ],
                    views: [],
                }),
            }),
        );

        expect(files.length).toBeGreaterThan(0);
    });

    it("fails when generator view definition has no matching @View class", () => {
        const view: GeneratorViewDefinition = {
            id: "nonexistent",
            __source: "/project/src/views/nonexistent.ts",
        };

        expect(() =>
            generate(
                makeInput({
                    views: [view],
                    scanResult: makeScanResult({
                        views: [makeRuntimeView("main")],
                    }),
                }),
            ),
        ).toThrow(/no matching @View/);
    });

    it("generates ambient env types with all registry interfaces", () => {
        const { envTypes } = generate(makeInput({ views: [] }));

        expect(envTypes.path).toBe("electro-env.d.ts");
        expect(envTypes.content).toContain("interface ModuleMethodMap");
        expect(envTypes.content).toContain(
            '"workspace:getActiveProject": _InvokeMethod<typeof import("./modules/workspace/workspace.service").WorkspaceService, "getActiveProject">;',
        );
        expect(envTypes.content).toContain(
            '"workspace:getSession": _InvokeMethod<typeof import("./modules/workspace/workspace.state").WorkspaceState, "getSession">;',
        );
        expect(envTypes.content).toContain("interface ModuleApiRegistry");
        expect(envTypes.content).toContain('"workspace": {');
        expect(envTypes.content).toContain('getSession: _InvokeMethod<typeof import("./modules/workspace/workspace.state").WorkspaceState, "getSession">;');
        expect(envTypes.content).toContain("interface ModuleSignalPayloadMap");
        expect(envTypes.content).toContain(
            '"projectOpened": _SignalPayloadFromMethod<typeof import("./modules/workspace/workspace.service").WorkspaceService, "onProjectOpened">;',
        );
        expect(envTypes.content).toContain("interface SignalBus {");
        expect(envTypes.content).toContain(
            "subscribe<TSignalId extends _SignalId>(signalId: TSignalId, handler: SignalListener<ModuleSignalPayloadMap[TSignalId]>): () => void;",
        );
        expect(envTypes.content).toContain(
            "subscribe<TSignalId extends _SignalId>(signalId: TSignalId, handler: ContextualSignalHandler<ModuleSignalPayloadMap[TSignalId]>): () => void;",
        );
        expect(envTypes.content).toContain("interface ModuleJobRegistry");
        expect(envTypes.content).toContain('"workspace": "sync-projects";');
        expect(envTypes.content).toContain("interface InjectableClassRegistry");
        expect(envTypes.content).toContain('"WorkspaceService": typeof import("./modules/workspace/workspace.service").WorkspaceService;');
        expect(envTypes.content).toContain("interface WindowClassRegistry");
        expect(envTypes.content).toContain('"main": typeof import("./windows/main.window").MainWindow;');
        expect(envTypes.content).toContain("interface ViewClassRegistry");
        expect(envTypes.content).toContain('"main": typeof import("./views/main.view").MainView;');
        expect(envTypes.content).toContain('interface WorkspaceService extends _ModuleAuthoringApi<"workspace"> {}');
        expect(envTypes.content).not.toContain('declare module "@electrojs/renderer"');
    });

    it("generates a runtime registry with module, window, and view arrays", () => {
        const { files } = generate(makeInput({ views: [] }));
        const registry = files.find((file) => file.path === "generated/runtime/registry.gen.ts");

        expect(registry).toBeDefined();
        expect(registry?.content).toContain('import type { AppKernelDefinition, ModuleClass, ViewClass, WindowClass } from "@electrojs/runtime";');
        expect(registry?.content).toContain('import { AuthModule as __electro_module_0 } from "../../../src/modules/auth/auth.module";');
        expect(registry?.content).toContain('import { WorkspaceModule as __electro_module_1 } from "../../../src/modules/workspace/workspace.module";');
        expect(registry?.content).toContain('import { MainWindow as __electro_window_0 } from "../../../src/windows/main.window";');
        expect(registry?.content).toContain('import { MainView as __electro_view_0 } from "../../../src/views/main.view";');
        expect(registry?.content).toContain("export const electroModules = [");
        expect(registry?.content).toContain("export const electroWindows = [");
        expect(registry?.content).toContain("export const electroViews = [");
        expect(registry?.content).toContain("root: __electro_module_1,");
        expect(registry?.content).toContain("} satisfies AppKernelDefinition;");
    });

    it("skips electroAppDefinition when root inference is ambiguous", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        const { files } = generate(
            makeInput({
                scanResult: makeScanResult({
                    modules: [makeAuthModule(), makeWorkspaceModule()],
                    views: [],
                }),
                views: [],
            }),
        );

        const registry = files.find((file) => file.path === "generated/runtime/registry.gen.ts");
        expect(registry?.content).not.toContain("electroAppDefinition");
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("multiple root module candidates"));
    });

    it("skips non-exported classes from the registry", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        const { files } = generate(
            makeInput({
                scanResult: makeScanResult({
                    modules: [{ ...makeWorkspaceModule(), exported: false }],
                    windows: [],
                    views: [],
                }),
                views: [],
            }),
        );

        const registry = files.find((file) => file.path === "generated/runtime/registry.gen.ts");
        expect(registry?.content).not.toContain("WorkspaceModule");
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("non-exported module"));
    });

    it("generates renderer declarations only inside package-local electro-env.d.ts", () => {
        const { files, packageTypes } = generate(
            makeInput({
                packageTargets: [
                    {
                        packageRoot: "/project/views/main",
                        viewId: "main",
                    },
                ],
                scanResult: makeScanResult({
                    views: [makeRuntimeView("main")],
                }),
            }),
        );

        expect(files.find((file) => file.path === "generated/views/main.bridge.d.ts")).toBeUndefined();
        expect(files.find((file) => file.path === "generated/renderer-env.d.ts")).toBeUndefined();
        expect(packageTypes[0]?.content).toContain('declare module "@electrojs/renderer"');
        expect(packageTypes[0]?.content).toContain("BridgeQueries");
        expect(packageTypes[0]?.content).not.toContain('declare module "@electrojs/runtime"');
        expect(packageTypes[0]?.content).not.toContain("_ModuleAuthoringApi");
        expect(packageTypes[0]?.content).not.toContain("_InvokeMethod");
    });

    it("generates package-local electro-env.d.ts for renderer packages", () => {
        const { packageTypes } = generate(
            makeInput({
                packageTargets: [
                    {
                        packageRoot: "/project/views/main",
                        viewId: "main",
                    },
                ],
                scanResult: makeScanResult({
                    views: [
                        makeRuntimeView("main", {
                            access: ["workspace:getSession", "workspace:getActiveProject"],
                            signals: ["projectOpened"],
                        }),
                    ],
                }),
            }),
        );

        expect(packageTypes).toHaveLength(1);
        expect(packageTypes[0]?.path).toBe("electro-env.d.ts");
        expect(packageTypes[0]?.content).toContain('declare module "@electrojs/renderer"');
        expect(packageTypes[0]?.content).not.toContain('declare module "@electrojs/runtime"');
        expect(packageTypes[0]?.content).not.toContain('declare module "@electrojs/common"');
        expect(packageTypes[0]?.content).not.toContain("_ModuleAuthoringApi");
        expect(packageTypes[0]?.content).not.toContain("_InvokeMethod");
        expect(packageTypes[0]?.content).toContain('"workspace:getSession"');
        expect(packageTypes[0]?.content).toContain('"workspace:getActiveProject"');
        expect(packageTypes[0]?.content).toContain('"projectOpened"');
    });
});
