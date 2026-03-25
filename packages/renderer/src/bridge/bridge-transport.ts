import { RendererTransportError } from "../errors/renderer.error";
import type { RendererPreloadApi } from "../types/transport";

export class BridgeTransport {
    public constructor(private readonly preloadApi: RendererPreloadApi) {}

    public async invoke(channel: string, args: readonly unknown[]): Promise<unknown> {
        try {
            return await this.preloadApi.invoke(channel, args);
        } catch (error) {
            throw RendererTransportError.invokeFailed(channel, error);
        }
    }
}
