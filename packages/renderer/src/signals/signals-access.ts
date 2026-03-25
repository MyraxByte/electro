import { RendererUsageError } from "../errors/renderer.error";
import type { RendererSignalsClient } from "./signals-client";

let currentSignals: RendererSignalsClient | undefined;

export function setSignals(signals: RendererSignalsClient): void {
    currentSignals = signals;
}

export function clearSignals(): void {
    currentSignals = undefined;
}

export function getSignals(): RendererSignalsClient {
    if (!currentSignals) {
        throw RendererUsageError.notInitialized("signals");
    }

    return currentSignals;
}
