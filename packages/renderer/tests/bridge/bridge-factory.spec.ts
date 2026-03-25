import { describe, expect, it, vi } from "vitest";
import { createBridgeProxy } from "../../src/bridge/bridge-factory";
import type { BridgeTransport } from "../../src/bridge/bridge-transport";
import { RendererUsageError } from "../../src/errors/renderer.error";

describe("createBridgeProxy", () => {
    it("creates namespace and method proxies", async () => {
        const invoke = vi.fn().mockResolvedValue("result");
        const transport = {
            invoke,
        } as unknown as BridgeTransport;

        const bridge = createBridgeProxy(transport) as {
            auth: {
                login: (...args: unknown[]) => Promise<unknown>;
            };
        };

        await expect(bridge.auth.login("a", "b")).resolves.toBe("result");
        expect(invoke).toHaveBeenCalledWith("auth:login", ["a", "b"]);
    });

    it('returns undefined for root "then" to avoid promise-like behavior', () => {
        const transport = {
            invoke: vi.fn(),
        } as unknown as BridgeTransport;

        const bridge = createBridgeProxy(transport) as Record<string, unknown>;

        expect(bridge.then).toBeUndefined();
    });

    it('returns undefined for namespace "then" to avoid promise-like behavior', () => {
        const transport = {
            invoke: vi.fn(),
        } as unknown as BridgeTransport;

        const bridge = createBridgeProxy(transport) as {
            auth: {
                then?: unknown;
            };
        };

        expect(bridge.auth.then).toBeUndefined();
    });

    it("rejects empty namespace key", () => {
        const transport = {
            invoke: vi.fn(),
        } as unknown as BridgeTransport;

        const bridge = createBridgeProxy(transport);

        expect(() => Reflect.get(bridge, "   ")).toThrow(RendererUsageError);
        expect(() => Reflect.get(bridge, "   ")).toThrow(/namespace key must be a non-empty string/i);
    });

    it("rejects empty method key", () => {
        const transport = {
            invoke: vi.fn(),
        } as unknown as BridgeTransport;

        const bridge = createBridgeProxy(transport) as { auth: object };
        const namespace = bridge.auth;

        expect(() => Reflect.get(namespace, "   ")).toThrow(RendererUsageError);
        expect(() => Reflect.get(namespace, "   ")).toThrow(/method key for namespace "auth" must be a non-empty string/i);
    });

    it("returns undefined for symbol keys", () => {
        const transport = {
            invoke: vi.fn(),
        } as unknown as BridgeTransport;

        const bridge = createBridgeProxy(transport) as Record<string | symbol, unknown>;

        expect(bridge[Symbol.toStringTag]).toBeUndefined();
    });
});
