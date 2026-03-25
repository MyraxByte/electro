import { RendererInitializationError } from "../errors/renderer.error";
import type { RendererPreloadApi } from "../types/transport";

const ELECTRO_RENDERER_WINDOW_KEY = "__ELECTRO_RENDERER__";

type ElectroRendererWindow = Window & {
    readonly [ELECTRO_RENDERER_WINDOW_KEY]?: RendererPreloadApi;
};

export class RendererContext {
    public static getPreloadApi(targetWindow: ElectroRendererWindow = window as ElectroRendererWindow): RendererPreloadApi {
        const preloadApi = targetWindow[ELECTRO_RENDERER_WINDOW_KEY];

        if (!preloadApi) {
            throw RendererInitializationError.preloadApiMissing(ELECTRO_RENDERER_WINDOW_KEY);
        }

        return preloadApi;
    }
}
