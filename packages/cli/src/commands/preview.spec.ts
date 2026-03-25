import { afterEach, describe, expect, it, vi } from "vitest";
import { preview } from "./preview";

const { buildMock, loadConfigMock, launchElectronMock, resolveMainEntryPathMock } = vi.hoisted(() => ({
    buildMock: vi.fn(),
    loadConfigMock: vi.fn(),
    launchElectronMock: vi.fn(),
    resolveMainEntryPathMock: vi.fn(),
}));

vi.mock("./build", () => ({
    build: buildMock,
}));

vi.mock("../dev/config-loader", () => ({
    loadConfig: loadConfigMock,
}));

vi.mock("../dev/electron-launcher", () => ({
    launchElectron: launchElectronMock,
}));

vi.mock("../dev/node-format", () => ({
    resolveMainEntryPath: resolveMainEntryPathMock,
}));

describe("preview()", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        buildMock.mockReset();
        loadConfigMock.mockReset();
        launchElectronMock.mockReset();
        resolveMainEntryPathMock.mockReset();
    });

    it("launches Electron with app, runtime, and view search roots", async () => {
        loadConfigMock.mockResolvedValue({
            root: "/workspace/app",
            config: {
                runtime: {
                    __source: "/workspace/app/packages/runtime/runtime.config.ts",
                },
            },
            views: [{ root: "/workspace/app/packages/view-main" }, { root: "/workspace/app/packages/view-auth" }],
        });
        resolveMainEntryPathMock.mockResolvedValue("/workspace/app/dist/main/index.mjs");
        launchElectronMock.mockResolvedValue({
            kill: vi.fn(),
            exited: Promise.resolve(0),
        });

        await preview({
            config: "electro.config.ts",
            outDir: "dist",
            minify: false,
            skipBuild: true,
        });

        expect(launchElectronMock).toHaveBeenCalledWith({
            searchRoots: ["/workspace/app", "/workspace/app/packages/runtime", "/workspace/app/packages/view-main", "/workspace/app/packages/view-auth"],
            cwd: "/workspace/app",
            entry: "/workspace/app/dist/main/index.mjs",
        });
    });
});
