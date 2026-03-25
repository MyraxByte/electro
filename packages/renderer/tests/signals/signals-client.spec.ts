import { describe, expect, it, vi } from "vitest";
import { RendererTransportError, RendererUsageError } from "../../src/errors/renderer.error";
import { RendererSignalsClient } from "../../src/signals/signals-client";
import type { RendererPreloadApi, RendererSignalListener } from "../../src/types/transport";

describe("RendererSignalsClient", () => {
    it("subscribes through preload api and returns subscription", () => {
        const dispose = vi.fn();
        const subscribe = vi.fn().mockReturnValue(dispose);

        const preloadApi: RendererPreloadApi = {
            invoke: vi.fn(),
            subscribe,
            once: vi.fn(),
        };

        const client = new RendererSignalsClient(preloadApi);
        const handler = vi.fn();

        const subscription = client.subscribe("auth:user-logged-in", handler);

        expect(subscribe).toHaveBeenCalledTimes(1);
        expect(typeof subscription.unsubscribe).toBe("function");

        subscription.unsubscribe();
        expect(dispose).toHaveBeenCalledTimes(1);
    });

    it("subscribes once through preload api and returns subscription", () => {
        const dispose = vi.fn();
        const once = vi.fn().mockReturnValue(dispose);

        const preloadApi: RendererPreloadApi = {
            invoke: vi.fn(),
            subscribe: vi.fn(),
            once,
        };

        const client = new RendererSignalsClient(preloadApi);
        const handler = vi.fn();

        const subscription = client.once("auth:user-logged-in", handler);

        expect(once).toHaveBeenCalledTimes(1);

        subscription.unsubscribe();
        expect(dispose).toHaveBeenCalledTimes(1);
    });

    it("calls zero-argument handler when payload is undefined", () => {
        let listener: RendererSignalListener | undefined;

        const preloadApi: RendererPreloadApi = {
            invoke: vi.fn(),
            subscribe: vi.fn().mockImplementation((_signalKey, receivedListener) => {
                listener = receivedListener;
                return () => {};
            }),
            once: vi.fn(),
        };

        const client = new RendererSignalsClient(preloadApi);
        const handler = vi.fn();

        client.subscribe("auth:user-logged-out", handler);
        listener?.(undefined);

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith();
    });

    it("passes payload to handler when payload is defined", () => {
        let listener: RendererSignalListener | undefined;

        const preloadApi: RendererPreloadApi = {
            invoke: vi.fn(),
            subscribe: vi.fn().mockImplementation((_signalKey, receivedListener) => {
                listener = receivedListener;
                return () => {};
            }),
            once: vi.fn(),
        };

        const client = new RendererSignalsClient(preloadApi);
        const handler = vi.fn();

        client.subscribe("auth:user-logged-in", handler);
        listener?.({ id: "u1" });

        expect(handler).toHaveBeenCalledWith({ id: "u1" });
    });

    it("rejects empty signal key", () => {
        const preloadApi: RendererPreloadApi = {
            invoke: vi.fn(),
            subscribe: vi.fn(),
            once: vi.fn(),
        };

        const client = new RendererSignalsClient(preloadApi);

        expect(() => client.subscribe("   ", vi.fn())).toThrow(RendererUsageError);
        expect(() => client.subscribe("   ", vi.fn())).toThrow(/signal key must be a non-empty string/i);
    });

    it("rejects non-function handler", () => {
        const preloadApi: RendererPreloadApi = {
            invoke: vi.fn(),
            subscribe: vi.fn(),
            once: vi.fn(),
        };

        const client = new RendererSignalsClient(preloadApi);

        expect(() => client.subscribe("auth:user-logged-in", 123 as never)).toThrow(RendererUsageError);
        expect(() => client.subscribe("auth:user-logged-in", 123 as never)).toThrow(/must be a function/i);
    });

    it("wraps subscribe errors", () => {
        const preloadApi: RendererPreloadApi = {
            invoke: vi.fn(),
            subscribe: vi.fn().mockImplementation(() => {
                throw new Error("boom");
            }),
            once: vi.fn(),
        };

        const client = new RendererSignalsClient(preloadApi);

        expect(() => client.subscribe("auth:user-logged-in", vi.fn())).toThrow(RendererTransportError);
        expect(() => client.subscribe("auth:user-logged-in", vi.fn())).toThrow(/subscription failed/i);
    });

    it("wraps once errors", () => {
        const preloadApi: RendererPreloadApi = {
            invoke: vi.fn(),
            subscribe: vi.fn(),
            once: vi.fn().mockImplementation(() => {
                throw new Error("boom");
            }),
        };

        const client = new RendererSignalsClient(preloadApi);

        expect(() => client.once("auth:user-logged-in", vi.fn())).toThrow(RendererTransportError);
        expect(() => client.once("auth:user-logged-in", vi.fn())).toThrow(/subscription failed/i);
    });
});
