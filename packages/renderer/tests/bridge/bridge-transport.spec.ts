import { describe, expect, it, vi } from "vitest";
import { BridgeTransport } from "../../src/bridge/bridge-transport";
import { RendererTransportError } from "../../src/errors/renderer.error";
import type { RendererPreloadApi } from "../../src/types/transport";

describe("BridgeTransport", () => {
    it("delegates invoke to preload api", async () => {
        const invoke = vi.fn().mockResolvedValue({ ok: true });
        const preloadApi: RendererPreloadApi = {
            invoke,
            subscribe: vi.fn(),
            once: vi.fn(),
        };

        const transport = new BridgeTransport(preloadApi);

        await expect(transport.invoke("auth:getMe", ["a"])).resolves.toEqual({ ok: true });
        expect(invoke).toHaveBeenCalledWith("auth:getMe", ["a"]);
    });

    it("wraps invoke errors", async () => {
        const preloadApi: RendererPreloadApi = {
            invoke: vi.fn().mockRejectedValue(new Error("boom")),
            subscribe: vi.fn(),
            once: vi.fn(),
        };

        const transport = new BridgeTransport(preloadApi);

        await expect(transport.invoke("auth:getMe", [])).rejects.toBeInstanceOf(RendererTransportError);
        await expect(transport.invoke("auth:getMe", [])).rejects.toMatchObject({
            code: "ELECTRO_RENDERER_TRANSPORT_INVOKE_FAILED",
            context: {
                channel: "auth:getMe",
            },
        });
    });
});
