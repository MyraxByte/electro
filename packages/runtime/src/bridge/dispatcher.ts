import type { RendererRegistry } from "../desktop/renderer-registry";
import { BridgeError } from "../errors/bridge";
import type { BridgeAccessGuard } from "./access-guard";
import type { BridgeHandler } from "./handler";
import { serializeBridgeError } from "./serializer";

/** Incoming IPC request from a renderer process. */
export interface BridgeRequest {
    /** Unique identifier for correlating request/response pairs. */
    readonly callId: string;
    /** The bridge channel name to invoke (e.g. `"app:getVersion"`). */
    readonly channel: string;
    /** Arguments to pass to the bridge handler. */
    readonly args: unknown[];
}

/** IPC response sent back to the renderer process. */
export interface BridgeResponse {
    /** Matches the `callId` of the originating {@link BridgeRequest}. */
    readonly callId: string;
    /** The handler's return value on success. */
    readonly result?: unknown;
    /** Serialized error information on failure. */
    readonly error?: { message: string; code?: string; context?: Record<string, unknown> };
}

/**
 * Routes IPC requests from renderer processes to the appropriate {@link BridgeHandler}.
 *
 * For each incoming request the dispatcher verifies that the kernel currently
 * accepts bridge calls,
 * that the requesting renderer has an active session, and that the session grants
 * access to the requested channel. If all checks pass the corresponding handler
 * is invoked; otherwise a serialized error is returned. Errors never propagate as
 * exceptions -- they are always returned as part of the {@link BridgeResponse}.
 *
 * @internal
 */
export class BridgeDispatcher {
    private readonly handlers = new Map<string, BridgeHandler>();

    public constructor(
        private readonly rendererRegistry: RendererRegistry,
        private readonly accessGuard: BridgeAccessGuard,
    ) {}

    /** Register a handler for a bridge channel. */
    public registerHandler(handler: BridgeHandler): void {
        this.handlers.set(handler.channel, handler);
    }

    /**
     * Process an IPC request from a renderer identified by its `webContentsId`.
     *
     * Performs kernel bridge-readiness, session-existence, and channel-access checks before
     * delegating to the registered handler. All errors are caught and returned as
     * serialized error objects in the response.
     */
    public async dispatch(webContentsId: number, request: BridgeRequest): Promise<BridgeResponse> {
        try {
            this.accessGuard.assertKernelReady();

            const session = this.rendererRegistry.getSession(webContentsId);
            if (!session) {
                throw BridgeError.unknownRenderer(webContentsId);
            }

            this.accessGuard.assertAccess(session, request.channel);

            const handler = this.handlers.get(request.channel);
            if (!handler) {
                throw BridgeError.routeNotFound(request.channel);
            }

            const result = await handler.invoke(request.args);

            return { callId: request.callId, result };
        } catch (error) {
            return {
                callId: request.callId,
                error: serializeBridgeError(error),
            };
        }
    }
}
