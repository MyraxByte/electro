import { describe, expect, it, afterEach } from "vitest";
import { RendererContext } from "../../src/core/renderer-context";
import { RendererInitializationError } from "../../src/errors/renderer.error";
import type { RendererPreloadApi } from "../../src/types/transport";

describe("RendererContext", () => {
    afterEach(() => {
        delete (window as Window & { __ELECTRO_RENDERER__?: RendererPreloadApi }).__ELECTRO_RENDERER__;
    });

    it("returns preload api from window", () => {
        const preloadApi: RendererPreloadApi = {
            invoke: async () => undefined,
            subscribe: () => () => {},
            once: () => () => {},
        };

        (window as Window & { __ELECTRO_RENDERER__?: RendererPreloadApi }).__ELECTRO_RENDERER__ = preloadApi;

        expect(RendererContext.getPreloadApi()).toBe(preloadApi);
    });

    it("throws when preload api is missing", () => {
        delete (window as Window & { __ELECTRO_RENDERER__?: RendererPreloadApi }).__ELECTRO_RENDERER__;

        expect(() => RendererContext.getPreloadApi()).toThrow(RendererInitializationError);
        expect(() => RendererContext.getPreloadApi()).toThrow(/preload api is not available/i);
    });
});
