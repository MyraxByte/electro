import { afterEach, describe, expect, it } from "vitest";
import { clearBridge, getBridge, setBridge } from "../../src/bridge/bridge-access";
import { RendererUsageError } from "../../src/errors/renderer.error";

describe("bridge-access", () => {
    afterEach(() => {
        clearBridge();
    });

    it("returns previously set bridge", () => {
        const bridge = { auth: {} };

        setBridge(bridge);

        expect(getBridge()).toBe(bridge);
    });

    it("clears stored bridge", () => {
        setBridge({ auth: {} });
        clearBridge();

        expect(() => getBridge()).toThrow(RendererUsageError);
        expect(() => getBridge()).toThrow(/bridge cannot be used before/i);
    });

    it("throws when bridge is not initialized", () => {
        expect(() => getBridge()).toThrow(RendererUsageError);
        expect(() => getBridge()).toThrow(/bridge cannot be used before/i);
    });
});
