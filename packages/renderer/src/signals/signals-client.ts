import { RendererTransportError, RendererUsageError } from "../errors/renderer.error";
import type { BridgeSignalHandler, RendererSignalSubscription } from "../types/public-api";
import type { RendererPreloadApi } from "../types/transport";
import { SignalSubscription } from "./signal-subscription";

type InternalSignalHandler = (payload: unknown) => void;

export class RendererSignalsClient {
    public constructor(private readonly preloadApi: RendererPreloadApi) {}

    public subscribe<TPayload>(signalKey: string, handler: BridgeSignalHandler<TPayload>): RendererSignalSubscription {
        this.ensureValidHandler(signalKey, handler);

        try {
            const dispose = this.preloadApi.subscribe(signalKey, this.createInternalHandler(handler));
            return new SignalSubscription(dispose);
        } catch (error) {
            throw RendererTransportError.subscribeFailed(signalKey, error);
        }
    }

    public once<TPayload>(signalKey: string, handler: BridgeSignalHandler<TPayload>): RendererSignalSubscription {
        this.ensureValidHandler(signalKey, handler);

        try {
            const dispose = this.preloadApi.once(signalKey, this.createInternalHandler(handler));
            return new SignalSubscription(dispose);
        } catch (error) {
            throw RendererTransportError.subscribeFailed(signalKey, error);
        }
    }

    private createInternalHandler<TPayload>(handler: BridgeSignalHandler<TPayload>): InternalSignalHandler {
        return (payload: unknown): void => {
            if (payload === undefined) {
                (handler as () => void)();
                return;
            }

            (handler as (payload: TPayload) => void)(payload as TPayload);
        };
    }

    private ensureValidHandler(signalKey: unknown, handler: unknown): asserts handler is (...args: unknown[]) => void {
        if (typeof signalKey !== "string" || signalKey.trim().length === 0) {
            throw RendererUsageError.invalidSignalKey(signalKey);
        }

        if (typeof handler !== "function") {
            throw RendererUsageError.invalidSignalHandler(signalKey, handler);
        }
    }
}
