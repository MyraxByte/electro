import { clearBridge, setBridge } from "../bridge/bridge-access";
import { createBridgeProxy } from "../bridge/bridge-factory";
import { BridgeTransport } from "../bridge/bridge-transport";
import { clearSignals, setSignals } from "../signals/signals-access";
import { RendererSignalsClient } from "../signals/signals-client";
import type { ElectroRendererApi, InitializeCallback } from "../types/public-api";
import { InitializationState } from "./initialization-state";
import { RendererContext } from "./renderer-context";

export class ElectroRendererManager implements ElectroRendererApi {
    private readonly state = new InitializationState();

    public async initialize(callback?: InitializeCallback): Promise<void> {
        this.state.ensureCanInitialize();
        this.state.markInitializing();

        try {
            const preloadApi = RendererContext.getPreloadApi();
            const transport = new BridgeTransport(preloadApi);
            const bridge = createBridgeProxy(transport);
            const signals = new RendererSignalsClient(preloadApi);

            setBridge(bridge);
            setSignals(signals);

            if (callback) {
                await callback();
            }

            this.state.markInitialized();
        } catch (error) {
            clearBridge();
            clearSignals();
            this.state.reset();
            throw error;
        }
    }

    public isInitialized(): boolean {
        return this.state.isInitialized();
    }
}

export const ElectroRenderer = new ElectroRendererManager();
