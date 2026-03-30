import { InjectionContext } from "../container/injection-context";
import { emitTargetError } from "../diagnostics";
import { SignalError } from "../errors/signal";
import type { SignalPublishListener } from "./relay";
import { PublicationRelay } from "./relay";
import { SignalContext } from "./context";

/**
 * A callback that receives only the signal payload.
 *
 * Use this form when the handler does not need access to the {@link SignalContext}.
 */
export type SignalListener<T = unknown> = (payload: T) => void | Promise<void>;

/**
 * A callback that receives both a {@link SignalContext} and the signal payload.
 *
 * Use this form when the handler needs metadata about the publication (e.g. timestamp).
 */
export type ContextualSignalHandler<T = unknown> = (context: SignalContext, payload: T) => void | Promise<void>;

/**
 * Union of the two supported handler signatures for {@link SignalBus.subscribe}.
 *
 * The bus distinguishes between the two forms by arity: handlers with two or more
 * parameters are treated as {@link ContextualSignalHandler}, all others as {@link SignalListener}.
 */
export type SignalHandler<T = unknown> = SignalListener<T> | ContextualSignalHandler<T>;

type InternalHandler = ContextualSignalHandler<unknown>;

function isContextualHandler(handler: SignalHandler): handler is ContextualSignalHandler {
    return handler.length >= 2;
}

function normalizeHandler(handler: SignalHandler): InternalHandler {
    if (isContextualHandler(handler)) {
        return handler as InternalHandler;
    }

    return (_context: SignalContext, payload: unknown) => (handler as SignalListener)(payload);
}

function bindToCurrentContext(handler: InternalHandler): InternalHandler {
    const injector = InjectionContext.current();

    if (!injector) {
        return handler;
    }

    const owner = InjectionContext.currentOwner();

    return (context: SignalContext, payload: unknown) => {
        if (owner) {
            return InjectionContext.runOwned(injector, owner, () => handler(context, payload));
        }
        return InjectionContext.run(injector, () => handler(context, payload));
    };
}

function ensureSignalId(signalId: unknown): string {
    if (typeof signalId !== "string") {
        throw SignalError.invalidSignalId(signalId);
    }

    const normalized = signalId.trim();
    if (normalized.length === 0) {
        throw SignalError.invalidSignalId(signalId);
    }

    return normalized;
}

/**
 * Fire-and-forget publish/subscribe signal bus for decoupled inter-module communication.
 *
 * Handlers are dispatched asynchronously via `queueMicrotask`, so `publish()` never blocks
 * the caller. Each handler runs inside the dependency-injection context that was active at
 * the time `subscribe()` was called, which means `inject()` works correctly inside handlers.
 *
 * @example
 * ```ts
 * // Subscribe to a signal (returns an unsubscribe function)
 * const unsub = signalBus.subscribe('user:login', (payload) => {
 *     console.log('User logged in:', payload.userId);
 * });
 *
 * // Publish a signal — all handlers run asynchronously
 * signalBus.publish('user:login', { userId: '42' });
 *
 * // Unsubscribe when no longer needed
 * unsub();
 * ```
 *
 * @example
 * ```ts
 * // Contextual handler with access to SignalContext
 * signalBus.subscribe('data:sync', (context, payload) => {
 *     console.log('Signal published at:', context.timestamp);
 * });
 * ```
 */
export class SignalBus {
    private readonly handlers = new Map<string, Set<InternalHandler>>();
    private readonly relay = new PublicationRelay();

    /**
     * Register a handler for the given signal.
     *
     * The handler is bound to the current injection context at call time, so
     * `inject()` resolves correctly even though the handler runs asynchronously.
     *
     * @returns A dispose function that removes the subscription.
     */
    public subscribe<T>(signalId: string, handler: SignalListener<T>): () => void;
    public subscribe<T>(signalId: string, handler: ContextualSignalHandler<T>): () => void;
    public subscribe<T>(signalId: string, handler: SignalHandler<T>): () => void {
        const id = ensureSignalId(signalId);
        const set = this.handlers.get(id) ?? new Set();
        const bound = bindToCurrentContext(normalizeHandler(handler as SignalHandler));

        set.add(bound);
        this.handlers.set(id, set);

        return () => {
            set.delete(bound);
            if (set.size === 0) this.handlers.delete(id);
        };
    }

    /**
     * Publish a signal to all registered handlers.
     *
     * Handlers are invoked asynchronously via `queueMicrotask` and their errors are
     * logged but never propagated to the publisher. The signal is also forwarded to
     * any connected {@link PublicationRelay} listeners (e.g. renderer processes).
     *
     * @remarks Payload is optional for signals that carry no data (`SignalBus.publish<void>('app:ready')`).
     */
    public publish<T = void>(signalId: string, payload?: T): void {
        const id = ensureSignalId(signalId);
        const handlers = this.handlers.get(id);

        if (handlers) {
            for (const handler of handlers) {
                queueMicrotask(() => {
                    void Promise.resolve(handler(new SignalContext(), payload)).catch((error) => {
                        emitTargetError(`SignalBus:${id}`, "handler failed", error);
                    });
                });
            }
        }

        this.relay.publish(id, payload);
    }

    /** @internal Connect a relay listener (used by renderer registry). */
    public connectRelay(listener: SignalPublishListener): () => void {
        return this.relay.connect(listener);
    }
}
