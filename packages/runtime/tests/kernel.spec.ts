import { Module } from "@electrojs/common";
import { afterEach, describe, expect, it, vi } from "vitest";

const adapterMock = vi.hoisted(() => ({
    registerIpcHandlers: vi.fn(() => vi.fn()),
}));

vi.mock("../src/bridge/ipc-adapter", () => ({
    registerIpcHandlers: adapterMock.registerIpcHandlers,
}));

import { AppKernel } from "../src/app/kernel";

const events: string[] = [];

@Module()
class LifecycleModule {
    async onInit() {
        events.push("init");
    }

    async onStart() {
        events.push("start");
    }

    async onReady() {
        events.push("ready");
    }

    async onShutdown() {
        events.push("shutdown");
    }

    async onDispose() {
        events.push("dispose");
    }
}

describe("AppKernel", () => {
    afterEach(() => {
        events.length = 0;
        adapterMock.registerIpcHandlers.mockClear();
    });

    it("separates initialization from startup", async () => {
        const kernel = AppKernel.create(LifecycleModule);

        await kernel.initialize();

        expect(kernel.getState()).toBe("initialized");
        expect(events).toEqual(["init"]);

        await kernel.start();

        expect(kernel.getState()).toBe("started");
        expect(events).toEqual(["init", "start", "ready"]);

        await kernel.shutdown();

        expect(kernel.getState()).toBe("stopped");
        expect(events).toEqual(["init", "start", "ready", "shutdown", "dispose"]);
    });

    it("can shut down after initialization without running startup hooks", async () => {
        const kernel = AppKernel.create(LifecycleModule);

        await kernel.initialize();
        await kernel.shutdown();

        expect(kernel.getState()).toBe("stopped");
        expect(events).toEqual(["init", "dispose"]);
    });
});
