import "./types/window";

import { getBridge } from "./bridge/bridge-access";
import { ElectroRenderer } from "./core/electro-renderer";
import { RendererError, RendererInitializationError, RendererTransportError, RendererUsageError } from "./errors/renderer.error";
import { getSignals } from "./signals/signals-access";
import type {
    BridgeContractEntry,
    BridgeSignalHandler,
    BuildBridgeApi,
    ElectroRendererApi,
    InitializeCallback,
    RendererSignalSubscription,
    RendererSignalsApi,
} from "./types/public-api";
import type { RendererPreloadApi, RendererSignalListener } from "./types/transport";

export interface BridgeQueries {}
export interface BridgeCommands {}
export interface BridgeSignals {}

export type BridgeApi = BuildBridgeApi<BridgeQueries, {}>;
export type SignalsApi = RendererSignalsApi<BridgeSignals>;

export const bridge = new Proxy(
    {},
    {
        get(_target, propertyKey: string | symbol): unknown {
            return Reflect.get(getBridge(), propertyKey);
        },
    },
) as BridgeApi;

export const signals: SignalsApi = {
    subscribe(signalKey, handler) {
        return getSignals().subscribe(signalKey, handler);
    },
    once(signalKey, handler) {
        return getSignals().once(signalKey, handler);
    },
};

export type {
    BridgeContractEntry,
    BridgeSignalHandler,
    ElectroRendererApi,
    InitializeCallback,
    RendererPreloadApi,
    RendererSignalListener,
    RendererSignalSubscription,
};
export { ElectroRenderer, RendererError, RendererInitializationError, RendererTransportError, RendererUsageError };
