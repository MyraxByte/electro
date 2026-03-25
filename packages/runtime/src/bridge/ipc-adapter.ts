import type { BridgeDispatcher } from "./dispatcher";
import type { RendererRegistry } from "../desktop/renderer-registry";
import { IPC_CHANNELS } from "./client";

/**
 * Registers Electron `ipcMain` handlers that connect the renderer bridge client
 * to the runtime's {@link BridgeDispatcher} and {@link RendererRegistry}.
 *
 * Two handlers are installed:
 * - `electro:register` — creates a {@link RendererSession} when a preload script initializes
 * - `electro:bridge` — routes bridge requests to the appropriate handler via the dispatcher
 *
 * @returns A dispose function that removes both handlers. Call during kernel shutdown.
 *
 * @internal Called by {@link AppKernel} after capability installation.
 */
export function registerIpcHandlers(dispatcher: BridgeDispatcher, rendererRegistry: RendererRegistry): () => void {
    const { ipcMain } = require("electron") as typeof import("electron");

    ipcMain.handle(IPC_CHANNELS.register, (event, payload: { viewId: string }) => {
        rendererRegistry.getOrCreateSession(event.sender.id, payload.viewId);
        return { ok: true };
    });

    ipcMain.handle(IPC_CHANNELS.bridge, (event, request) => {
        return dispatcher.dispatch(event.sender.id, request);
    });

    return () => {
        ipcMain.removeHandler(IPC_CHANNELS.register);
        ipcMain.removeHandler(IPC_CHANNELS.bridge);
    };
}
