import { afterEach, describe, expect, it, vi } from "vitest";
import { clearBridge, getBridge } from "../../src/bridge/bridge-access";
import { ElectroRendererManager } from "../../src/core/electro-renderer";
import { RendererInitializationError, RendererUsageError } from "../../src/errors/renderer.error";
import { clearSignals, getSignals } from "../../src/signals/signals-access";
import type { RendererPreloadApi } from "../../src/types/transport";

function setPreloadApi(preloadApi: RendererPreloadApi): void {
    (window as Window & { __ELECTRO_RENDERER__?: RendererPreloadApi }).__ELECTRO_RENDERER__ = preloadApi;
}

function clearPreloadApi(): void {
    delete (window as Window & { __ELECTRO_RENDERER__?: RendererPreloadApi }).__ELECTRO_RENDERER__;
}

describe("ElectroRenderer", () => {
    afterEach(() => {
        clearBridge();
        clearSignals();
        clearPreloadApi();
    });

    it("initializes bridge and signals", async () => {
        setPreloadApi({
            invoke: vi.fn().mockResolvedValue(undefined),
            subscribe: vi.fn().mockReturnValue(() => {}),
            once: vi.fn().mockReturnValue(() => {}),
        });

        const manager = new ElectroRendererManager();

        await manager.initialize();

        expect(manager.isInitialized()).toBe(true);
        expect(() => getBridge()).not.toThrow();
        expect(() => getSignals()).not.toThrow();
    });

    it("executes callback during initialization", async () => {
        setPreloadApi({
            invoke: vi.fn().mockResolvedValue(undefined),
            subscribe: vi.fn().mockReturnValue(() => {}),
            once: vi.fn().mockReturnValue(() => {}),
        });

        const manager = new ElectroRendererManager();
        const callback = vi.fn().mockResolvedValue(undefined);

        await manager.initialize(callback);

        expect(callback).toHaveBeenCalledTimes(1);
        expect(manager.isInitialized()).toBe(true);
    });

    it("resets state when callback throws", async () => {
        setPreloadApi({
            invoke: vi.fn().mockResolvedValue(undefined),
            subscribe: vi.fn().mockReturnValue(() => {}),
            once: vi.fn().mockReturnValue(() => {}),
        });

        const manager = new ElectroRendererManager();

        await expect(
            manager.initialize(async () => {
                throw new Error("boom");
            }),
        ).rejects.toThrow("boom");

        expect(manager.isInitialized()).toBe(false);
        expect(() => getBridge()).toThrow(RendererUsageError);
        expect(() => getSignals()).toThrow(RendererUsageError);
    });

    it("throws when preload api is missing", async () => {
        const manager = new ElectroRendererManager();

        await expect(manager.initialize()).rejects.toBeInstanceOf(RendererInitializationError);
        expect(manager.isInitialized()).toBe(false);
    });

    it("does not allow second initialization", async () => {
        setPreloadApi({
            invoke: vi.fn().mockResolvedValue(undefined),
            subscribe: vi.fn().mockReturnValue(() => {}),
            once: vi.fn().mockReturnValue(() => {}),
        });

        const manager = new ElectroRendererManager();

        await manager.initialize();

        await expect(manager.initialize()).rejects.toBeInstanceOf(RendererInitializationError);
        await expect(manager.initialize()).rejects.toMatchObject({
            code: "ELECTRO_RENDERER_ALREADY_INITIALIZED",
        });
    });
});
