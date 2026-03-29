import { RuntimeError } from "./runtime";

/**
 * Errors thrown by the IPC bridge subsystem when renderer-to-main communication fails.
 *
 * All instances are created through static factory methods; direct construction is not allowed.
 */
export class BridgeError extends RuntimeError {
    private constructor(message: string, code: string, context?: Readonly<Record<string, unknown>>) {
        super(message, code, context);
    }

    /** The originating view is not whitelisted for the requested bridge channel. */
    public static accessDenied(viewId: string, channel: string): BridgeError {
        return new BridgeError(`View "${viewId}" does not have access to bridge channel "${channel}".`, "ELECTRO_BRIDGE_ACCESS_DENIED", { viewId, channel });
    }

    /** No handler has been registered for the given bridge channel. */
    public static routeNotFound(channel: string): BridgeError {
        return new BridgeError(`No bridge handler registered for channel "${channel}".`, "ELECTRO_BRIDGE_ROUTE_NOT_FOUND", { channel });
    }

    /**
     * A bridge handler threw while processing a request.
     *
     * @remarks
     * The original error is attached as {@link Error.cause}.
     */
    public static handlerFailed(channel: string, cause: unknown): BridgeError {
        const error = new BridgeError(`Bridge handler for channel "${channel}" threw an error.`, "ELECTRO_BRIDGE_HANDLER_FAILED", { channel });
        error.cause = cause;
        return error;
    }

    /** A bridge call arrived before startup entered the `starting` phase or after shutdown began. */
    public static kernelNotReady(): BridgeError {
        return new BridgeError("Bridge invocation rejected — kernel is not accepting bridge calls in its current state.", "ELECTRO_BRIDGE_KERNEL_NOT_READY");
    }

    /** A bridge request came from a `webContents` that is not associated with any known view. */
    public static unknownRenderer(webContentsId: number): BridgeError {
        return new BridgeError(`Received bridge request from unregistered renderer (webContents id: ${webContentsId}).`, "ELECTRO_BRIDGE_UNKNOWN_RENDERER", {
            webContentsId,
        });
    }
}
