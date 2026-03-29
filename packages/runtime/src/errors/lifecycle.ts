import { RuntimeError } from "./runtime";

/**
 * Errors thrown during kernel and module lifecycle transitions (start, shutdown, hook execution).
 *
 * All instances are created through static factory methods; direct construction is not allowed.
 */
export class LifecycleError extends RuntimeError {
    private constructor(message: string, code: string, context?: Readonly<Record<string, unknown>>) {
        super(message, code, context);
    }

    /**
     * A lifecycle hook (`onInit`, `onStart`, `onReady`, etc.) threw during the startup sequence.
     *
     * @remarks
     * The original error is attached as {@link Error.cause}.
     */
    public static startupFailed(hookName: string, targetName: string, cause: unknown): LifecycleError {
        const error = new LifecycleError(`Lifecycle hook "${hookName}" failed in "${targetName}".`, "ELECTRO_LIFECYCLE_STARTUP_FAILED", {
            hookName,
            targetName,
        });
        error.cause = cause;
        return error;
    }

    /** The kernel was asked to move to a state that is not reachable from its current state. */
    public static invalidKernelTransition(from: string, to: string): LifecycleError {
        return new LifecycleError(`Invalid kernel state transition from "${from}" to "${to}".`, "ELECTRO_LIFECYCLE_INVALID_KERNEL_TRANSITION", { from, to });
    }

    /** A module was asked to move to a state that is not reachable from its current state. */
    public static invalidModuleTransition(moduleId: string, from: string, to: string): LifecycleError {
        return new LifecycleError(`Invalid module state transition for "${moduleId}": "${from}" → "${to}".`, "ELECTRO_LIFECYCLE_INVALID_MODULE_TRANSITION", {
            moduleId,
            from,
            to,
        });
    }

    /** Shutdown was requested but the kernel has not been started yet. */
    public static kernelNotStarted(): LifecycleError {
        return new LifecycleError("Cannot shut down kernel — it has not been started.", "ELECTRO_LIFECYCLE_NOT_STARTED");
    }

    /** Start was requested but the kernel is already started or in the process of starting. */
    public static kernelAlreadyStarted(): LifecycleError {
        return new LifecycleError("Cannot start kernel — it is already started or starting.", "ELECTRO_LIFECYCLE_ALREADY_STARTED");
    }
}
