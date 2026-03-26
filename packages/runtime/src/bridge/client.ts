/**
 * Creates the preload-side bridge client that connects renderer processes
 * to the main process via Electron IPC.
 *
 * This function is called inside generated preload scripts. It returns an object
 * matching the {@link RendererPreloadApi} contract expected by `@electrojs/renderer`:
 * - `invoke(channel, payload)` — sends a bridge request to the main process
 * - `subscribe(signalKey, listener)` — listens for signals forwarded from the main process
 * - `once(signalKey, listener)` — like `subscribe`, but auto-removes after the first match
 *
 * On creation the client sends an `electro:register` message so the main process
 * can create a {@link RendererSession} for this renderer's `webContentsId`.
 *
 * @example Generated preload script (produced by `@electrojs/codegen`):
 * ```ts
 * import { contextBridge, ipcRenderer } from "electron";
 * import { createBridgeClient } from "@electrojs/runtime";
 *
 * contextBridge.exposeInMainWorld("__ELECTRO_RENDERER__", createBridgeClient({
 *     viewId: "main",
 *     ipcRenderer,
 * }));
 * ```
 */

// IPC channel constants — shared between client (preload) and adapter (main).
const BRIDGE_CHANNEL = "electro:bridge";
const REGISTER_CHANNEL = "electro:register";

/** @internal Matches the signal payload shape sent by the main process. */
interface SignalMessage {
    readonly signalId: string;
    readonly payload: unknown;
}

/**
 * Minimal subset of Electron's `IpcRenderer` used by the bridge client.
 * Avoids importing the full Electron types at the package level.
 */
export interface ElectroIpcRenderer {
    invoke(channel: string, ...args: unknown[]): Promise<unknown>;
    on(channel: string, listener: (event: unknown, ...args: unknown[]) => void): void;
    removeListener(channel: string, listener: (event: unknown, ...args: unknown[]) => void): void;
}

/** Configuration accepted by {@link createBridgeClient}. */
export interface BridgeClientConfig {
    /** The view ID this renderer is associated with (from `@View({ id })` or derived from source). */
    readonly viewId: string;
    /** Electron's `ipcRenderer` instance, available in preload scripts. */
    readonly ipcRenderer: ElectroIpcRenderer;
}

/** The object exposed on `window.__ELECTRO_RENDERER__` for the renderer package to consume. */
export interface PreloadBridgeApi {
    invoke(channel: string, payload: readonly unknown[]): Promise<unknown>;
    subscribe(signalKey: string, listener: (payload: unknown) => void): () => void;
    once(signalKey: string, listener: (payload: unknown) => void): () => void;
}

interface SerializedBridgeError {
    readonly message: string;
    readonly code?: string;
}

interface BridgeInvokeResponse {
    readonly callId: string;
    readonly result?: unknown;
    readonly error?: SerializedBridgeError;
}

const KERNEL_READY_ERROR_CODE = "ELECTRO_BRIDGE_KERNEL_NOT_READY";
const KERNEL_READY_RETRY_DELAY_MS = 25;
const KERNEL_READY_RETRY_LIMIT = 80;

function sleep(delayMs: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, delayMs));
}

/**
 * Create a bridge client for use in Electron preload scripts.
 *
 * The returned object is intended to be passed to
 * `contextBridge.exposeInMainWorld("__ELECTRO_RENDERER__", ...)`.
 */
export function createBridgeClient(config: BridgeClientConfig): PreloadBridgeApi {
    const { viewId, ipcRenderer } = config;

    // Register this renderer with the main process so it gets a RendererSession.
    const registerPromise = ipcRenderer.invoke(REGISTER_CHANNEL, { viewId });

    async function invokeMain(channel: string, payload: readonly unknown[]): Promise<BridgeInvokeResponse> {
        const callId = crypto.randomUUID();
        return (await ipcRenderer.invoke(BRIDGE_CHANNEL, {
            callId,
            channel,
            args: payload,
        })) as BridgeInvokeResponse;
    }

    async function invokeWhenReady(channel: string, payload: readonly unknown[]): Promise<BridgeInvokeResponse> {
        await registerPromise;

        for (let attempt = 0; attempt < KERNEL_READY_RETRY_LIMIT; attempt += 1) {
            const response = await invokeMain(channel, payload);
            if (response.error?.code !== KERNEL_READY_ERROR_CODE) {
                return response;
            }

            if (attempt === KERNEL_READY_RETRY_LIMIT - 1) {
                return response;
            }

            await sleep(KERNEL_READY_RETRY_DELAY_MS);
        }

        return invokeMain(channel, payload);
    }

    return {
        async invoke(channel: string, payload: readonly unknown[]): Promise<unknown> {
            const response = await invokeWhenReady(channel, payload);

            if (response.error) {
                const err = new Error(response.error.message);
                if (response.error.code) {
                    (err as Error & { code?: string }).code = response.error.code;
                }
                throw err;
            }

            return response.result;
        },

        subscribe(signalKey: string, listener: (payload: unknown) => void): () => void {
            const handler = (_event: unknown, ...args: unknown[]): void => {
                const data = args[0] as SignalMessage;
                if (data.signalId === signalKey) {
                    listener(data.payload);
                }
            };

            ipcRenderer.on(SIGNAL_CHANNEL, handler);

            return () => {
                ipcRenderer.removeListener(SIGNAL_CHANNEL, handler);
            };
        },

        once(signalKey: string, listener: (payload: unknown) => void): () => void {
            let removed = false;

            const handler = (_event: unknown, ...args: unknown[]): void => {
                const data = args[0] as SignalMessage;
                if (data.signalId === signalKey && !removed) {
                    removed = true;
                    ipcRenderer.removeListener(SIGNAL_CHANNEL, handler);
                    listener(data.payload);
                }
            };

            ipcRenderer.on(SIGNAL_CHANNEL, handler);

            return () => {
                if (!removed) {
                    removed = true;
                    ipcRenderer.removeListener(SIGNAL_CHANNEL, handler);
                }
            };
        },
    };
}

// Signal channel constant — used by subscribe/once above and by the main-process relay.
const SIGNAL_CHANNEL = "electro:signal";

/** Well-known IPC channel names used by the ElectroJS bridge protocol. */
export const IPC_CHANNELS = {
    bridge: BRIDGE_CHANNEL,
    register: REGISTER_CHANNEL,
    signal: SIGNAL_CHANNEL,
} as const;
