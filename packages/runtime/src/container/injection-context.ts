import { AsyncLocalStorage } from "node:async_hooks";
import type { Injector } from "./injector";

/**
 * @internal
 * Snapshot of the active DI scope stored in `AsyncLocalStorage`.
 */
interface InjectionScope {
    readonly injector: Injector;
    readonly owner?: object;
}

const storage = new AsyncLocalStorage<InjectionScope>();

/**
 * Ambient injection context backed by `AsyncLocalStorage`.
 *
 * The framework uses `InjectionContext` to make the current {@link Injector} available
 * to {@link inject} calls without requiring explicit injector references. It is set
 * automatically during provider construction, lifecycle hooks, and capability handlers.
 *
 * @remarks
 * This is a framework-internal API. Application code should use {@link inject} instead
 * of interacting with `InjectionContext` directly.
 *
 * @internal
 */
export const InjectionContext = {
    /**
     * Execute `fn` within the scope of the given injector.
     * Any {@link inject} call made synchronously inside `fn` will resolve from this injector.
     */
    run<T>(injector: Injector, fn: () => T): T {
        return storage.run({ injector }, fn);
    },

    /**
     * Execute `fn` within the scope of the given injector, additionally tracking `owner`
     * as the object currently being constructed or invoked.
     */
    runOwned<T>(injector: Injector, owner: object, fn: () => T): T {
        return storage.run({ injector, owner }, fn);
    },

    /** Return the injector for the current execution context, or `undefined` if none is active. */
    current(): Injector | undefined {
        return storage.getStore()?.injector;
    },

    /** Return the owner object of the current execution context, or `undefined` if not set. */
    currentOwner(): object | undefined {
        return storage.getStore()?.owner;
    },

    /** Whether a framework-managed injection context is currently active. */
    isActive(): boolean {
        return storage.getStore() !== undefined;
    },
} as const;
