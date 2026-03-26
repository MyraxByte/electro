export abstract class RendererError extends Error {
    public readonly code: string;
    public readonly context?: Readonly<Record<string, unknown>>;

    protected constructor(message: string, code: string, context?: Readonly<Record<string, unknown>>) {
        super(message);

        this.name = new.target.name;
        this.code = code;
        this.context = context;

        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class RendererInitializationError extends RendererError {
    public static alreadyInitialized(): RendererInitializationError {
        return new RendererInitializationError("ElectroRenderer.initialize() can only be called once.", "ELECTRO_RENDERER_ALREADY_INITIALIZED");
    }

    public static preloadApiMissing(windowKey: string): RendererInitializationError {
        return new RendererInitializationError(
            `ElectroJS renderer preload API is not available on window.${windowKey}.`,
            "ELECTRO_RENDERER_PRELOAD_API_MISSING",
            { windowKey },
        );
    }
}

export class RendererUsageError extends RendererError {
    public static notInitialized(operation: string): RendererUsageError {
        return new RendererUsageError(`${operation} cannot be used before ElectroRenderer.initialize() has completed.`, "ELECTRO_RENDERER_NOT_INITIALIZED", {
            operation,
        });
    }

    public static invalidBridgeNamespaceKey(received: unknown): RendererUsageError {
        return new RendererUsageError("Bridge namespace key must be a non-empty string.", "ELECTRO_RENDERER_INVALID_BRIDGE_NAMESPACE_KEY", { received });
    }

    public static invalidBridgeMethodKey(namespace: string, received: unknown): RendererUsageError {
        return new RendererUsageError(
            `Bridge method key for namespace "${namespace}" must be a non-empty string.`,
            "ELECTRO_RENDERER_INVALID_BRIDGE_METHOD_KEY",
            { namespace, received },
        );
    }

    public static invalidSignalKey(signalKey: unknown): RendererUsageError {
        return new RendererUsageError("Signal key must be a non-empty string.", "ELECTRO_RENDERER_INVALID_SIGNAL_KEY", {
            received: signalKey,
        });
    }

    public static invalidSignalHandler(signalKey: unknown, received: unknown): RendererUsageError {
        return new RendererUsageError(`Signal handler for "${String(signalKey)}" must be a function.`, "ELECTRO_RENDERER_INVALID_SIGNAL_HANDLER", {
            signalKey,
            receivedType: typeof received,
        });
    }
}

export class RendererTransportError extends RendererError {
    public static invokeFailed(channel: string, cause: unknown): RendererTransportError {
        return new RendererTransportError(`Bridge transport invocation failed for channel "${channel}".`, "ELECTRO_RENDERER_TRANSPORT_INVOKE_FAILED", {
            channel,
            cause,
        });
    }

    public static subscribeFailed(signalKey: string, cause: unknown): RendererTransportError {
        return new RendererTransportError(`Signal subscription failed for "${signalKey}".`, "ELECTRO_RENDERER_SIGNAL_SUBSCRIBE_FAILED", { signalKey, cause });
    }
}
