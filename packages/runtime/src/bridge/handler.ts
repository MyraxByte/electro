import { InjectionContext } from "../container/injection-context";
import type { Injector } from "../container/injector";
import type { BridgeMethodDefinition } from "../modules/scanner";

type Awaitable<T> = T | PromiseLike<T>;

/**
 * A bound function that executes a provider method with the given arguments.
 *
 * Created during bootstrap by binding the method to its provider instance.
 */
export type BridgeInvoker = (...args: unknown[]) => Awaitable<unknown>;

/**
 * Wraps a provider method so it can be invoked via IPC from a renderer process.
 *
 * Each handler is bound to a specific bridge channel and restores the correct
 * dependency-injection context before calling the underlying provider method,
 * ensuring that `inject()` works as expected inside bridge handlers.
 *
 * @internal Created during module bootstrap; not instantiated by consumers.
 */
export class BridgeHandler {
    /** The bridge channel this handler responds to (e.g. `"app:getVersion"`). */
    public readonly channel: string;
    /** Whether this bridge method is a `"command"` (mutating) or `"query"` (read-only). */
    public readonly kind: "command" | "query";
    /** The ID of the module that owns this handler. */
    public readonly moduleId: string;

    private readonly invoker: BridgeInvoker;
    private readonly injector: Injector;

    public constructor(definition: BridgeMethodDefinition, invoker: BridgeInvoker, injector: Injector) {
        this.channel = definition.channel;
        this.kind = definition.kind;
        this.moduleId = definition.moduleId;
        this.invoker = invoker;
        this.injector = injector;
    }

    /**
     * Execute the underlying provider method within the correct injection context.
     *
     * @returns The value returned by the provider method.
     */
    public async invoke(args: unknown[]): Promise<unknown> {
        return InjectionContext.run(this.injector, () => this.invoker(...args));
    }
}
