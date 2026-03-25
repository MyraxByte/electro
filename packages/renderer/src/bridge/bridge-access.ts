import { RendererUsageError } from "../errors/renderer.error";

let currentBridge: Record<string, unknown> | undefined;

export function setBridge(bridge: Record<string, unknown>): void {
    currentBridge = bridge;
}

export function clearBridge(): void {
    currentBridge = undefined;
}

export function getBridge(): Record<string, unknown> {
    if (!currentBridge) {
        throw RendererUsageError.notInitialized("bridge");
    }

    return currentBridge;
}
