import { describe, expect, it } from "vitest";
import { BridgeAccessGuard } from "../src/bridge/access-guard";

describe("BridgeAccessGuard", () => {
    it("allows bridge calls during startup and after startup completes", () => {
        const guard = new BridgeAccessGuard();

        guard.setKernelState("starting");
        expect(() => guard.assertKernelReady()).not.toThrow();

        guard.setKernelState("started");
        expect(() => guard.assertKernelReady()).not.toThrow();
    });

    it("rejects bridge calls before startup begins", () => {
        const guard = new BridgeAccessGuard();

        guard.setKernelState("initialized");
        expect(() => guard.assertKernelReady()).toThrowErrorMatchingInlineSnapshot(
            `[BridgeError: Bridge invocation rejected — kernel is not accepting bridge calls in its current state.]`,
        );
    });
});
