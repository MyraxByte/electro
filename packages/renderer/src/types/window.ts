import type { RendererPreloadApi } from "./transport";

declare global {
    interface Window {
        readonly __ELECTRO_RENDERER__?: RendererPreloadApi;
    }
}
