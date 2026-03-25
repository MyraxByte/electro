import { describe, expect, it, afterEach } from "vitest";
import { RendererUsageError } from "../../src/errors/renderer.error";
import { clearSignals, getSignals, setSignals } from "../../src/signals/signals-access";
import { RendererSignalsClient } from "../../src/signals/signals-client";
import type { RendererPreloadApi } from "../../src/types/transport";

function createPreloadApi(): RendererPreloadApi {
    return {
        invoke: async () => undefined,
        subscribe: () => () => {},
        once: () => () => {},
    };
}

describe("signals-access", () => {
    afterEach(() => {
        clearSignals();
    });

    it("returns previously set signals client", () => {
        const client = new RendererSignalsClient(createPreloadApi());

        setSignals(client);

        expect(getSignals()).toBe(client);
    });

    it("clears stored signals client", () => {
        setSignals(new RendererSignalsClient(createPreloadApi()));
        clearSignals();

        expect(() => getSignals()).toThrow(RendererUsageError);
        expect(() => getSignals()).toThrow(/signals cannot be used before/i);
    });

    it("throws when signals are not initialized", () => {
        expect(() => getSignals()).toThrow(RendererUsageError);
        expect(() => getSignals()).toThrow(/signals cannot be used before/i);
    });
});
