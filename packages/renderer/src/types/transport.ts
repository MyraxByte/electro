export type RendererSignalListener = (payload: unknown) => void;

export interface RendererPreloadApi {
    invoke(channel: string, payload: readonly unknown[]): Promise<unknown>;
    subscribe(signalKey: string, listener: RendererSignalListener): () => void;
    once(signalKey: string, listener: RendererSignalListener): () => void;
}
