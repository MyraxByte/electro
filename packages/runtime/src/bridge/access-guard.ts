import type { KernelState } from "../app/kernel";
import type { RendererSession } from "../desktop/renderer-session";
import { BridgeError } from "../errors/bridge";

/**
 * Enforces access control for bridge IPC calls.
 *
 * Checks two conditions before a bridge request is allowed through:
 * 1. The application kernel must be in the `"starting"` or `"started"` state.
 * 2. The requesting renderer's {@link RendererSession} must have the target channel
 *    in its access set (as declared in `@View({ access: [...] })`).
 *
 * @internal Used by {@link BridgeDispatcher}; not intended for direct consumer use.
 */
export class BridgeAccessGuard {
    private kernelState: KernelState = "idle";

    /** Update the tracked kernel state. Called by the kernel during lifecycle transitions. */
    public setKernelState(state: KernelState): void {
        this.kernelState = state;
    }

    /**
     * Assert that the kernel is in a state where bridge calls are allowed.
     *
     * @throws {BridgeError} If the kernel is not ready to handle requests.
     */
    public assertKernelReady(): void {
        if (this.kernelState !== "starting" && this.kernelState !== "started") {
            throw BridgeError.kernelNotReady();
        }
    }

    /**
     * Assert that the renderer session has access to the given bridge channel.
     *
     * @throws {BridgeError} If the view's `access` list does not include the channel.
     */
    public assertAccess(session: RendererSession, channel: string): void {
        if (!session.hasAccess(channel)) {
            throw BridgeError.accessDenied(session.viewId, channel);
        }
    }
}
