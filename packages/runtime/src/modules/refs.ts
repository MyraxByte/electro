import type { Constructor } from "@electrojs/common";
import type { Injector } from "../container/injector";
import { LifecycleError } from "../errors/lifecycle";
import type { ProviderDefinition } from "./scanner";

// --- Lifecycle types ---

/**
 * Optional lifecycle hooks that modules and providers can implement to participate
 * in the application startup/shutdown sequence.
 *
 * Hooks are called per-module in dependency-first topological order during startup,
 * and in reverse order during shutdown. Within each module, provider hooks run
 * before the module's own hook.
 *
 * @example
 * ```ts
 * @Injectable()
 * class DatabaseService implements LifecycleTarget {
 *     async onInit() { await this.connect(); }
 *     async onShutdown() { await this.disconnect(); }
 * }
 * ```
 *
 * @remarks
 * All hooks may be synchronous or asynchronous. A thrown error in any startup hook
 * triggers automatic rollback of already-initialized modules.
 */
export interface LifecycleTarget {
    /** Called during initialization phase. Use for setting up connections, state, etc. */
    onInit?(): void | Promise<void>;
    /** Called after all modules have been initialized. Use for cross-module coordination. */
    onReady?(): void | Promise<void>;
    /** Called during graceful shutdown. Use for releasing resources, closing connections. */
    onShutdown?(): void | Promise<void>;
    /** Called after shutdown completes. Use for final cleanup (file handles, timers, etc.). */
    onDispose?(): void | Promise<void>;
}

/**
 * Represents the current phase of a module's lifecycle.
 *
 * Transitions follow a strict state machine: creating -> ready -> started -> stopping -> stopped.
 * Any state can also transition to "failed".
 */
export type ModuleStatus = "creating" | "ready" | "started" | "stopping" | "stopped" | "failed";

const ALLOWED_TRANSITIONS: Readonly<Record<ModuleStatus, readonly ModuleStatus[]>> = {
    creating: ["ready", "failed"],
    ready: ["started", "failed"],
    started: ["stopping", "failed"],
    stopping: ["stopped", "failed"],
    stopped: [],
    failed: [],
};

// --- Provider Ref ---

/**
 * Live runtime representation of a provider (service, view, or window) within a module.
 *
 * Wraps the instantiated provider together with its static definition and the
 * module-scoped injector it was resolved from. Used internally by the framework
 * to invoke bridge handlers, lifecycle hooks, and capability installations.
 */
export class ProviderRef {
    public constructor(
        /** The static definition this provider was created from. */
        public readonly definition: ProviderDefinition,
        /** The live provider instance, potentially implementing {@link LifecycleTarget}. */
        public readonly instance: LifecycleTarget,
        /** The module-scoped injector that resolved this provider. */
        public readonly injector: Injector,
    ) {}

    public get id(): string {
        return this.definition.id;
    }

    public get target(): Constructor {
        return this.definition.target;
    }

    public get ownerModuleId(): string {
        return this.definition.ownerModuleId;
    }

    /**
     * Resolves a method on the provider instance by name.
     * Returns `undefined` if the property does not exist or is not a function.
     */
    public getMethod(methodName: string): ((...args: unknown[]) => unknown) | undefined {
        const method = Reflect.get(this.instance, methodName);
        return typeof method === "function" ? (method as (...args: unknown[]) => unknown) : undefined;
    }
}

// --- Module Ref ---

/**
 * Live runtime representation of a loaded module.
 *
 * Each `ModuleRef` holds the instantiated module class, its child injector, resolved
 * providers, and lifecycle status. This is the second layer of the two-layer entity
 * model: `ModuleDefinition` (static, serializable) is produced by the scanner, then
 * `ModuleRef` is created during bootstrap when the module is actually instantiated.
 *
 * @remarks
 * Status transitions are validated against an internal state machine and will throw
 * {@link LifecycleError} on illegal transitions.
 */
export class ModuleRef {
    private statusInternal: ModuleStatus = "creating";
    private importsInternal: readonly ModuleRef[] = [];

    public constructor(
        /** Unique module identifier, derived from the class name or `@Module({ id })`. */
        public readonly id: string,
        /** The decorated module class constructor. */
        public readonly target: Constructor,
        /** Module-scoped child injector containing this module's providers. */
        public readonly injector: Injector,
        /** The live module class instance, potentially implementing {@link LifecycleTarget}. */
        public readonly instance: LifecycleTarget,
        /** All providers declared in this module. */
        public readonly providers: readonly ProviderRef[],
        /** Set of provider constructors that this module exports to importing modules. */
        public readonly exportTargets: ReadonlySet<Constructor>,
    ) {}

    public get status(): ModuleStatus {
        return this.statusInternal;
    }

    public get imports(): readonly ModuleRef[] {
        return this.importsInternal;
    }

    /** Subset of {@link providers} that are listed in this module's exports. */
    public get exportedProviders(): readonly ProviderRef[] {
        return this.providers.filter((p) => this.exportTargets.has(p.target));
    }

    /**
     * @internal Sets the resolved import references after all modules are loaded.
     * Called once during bootstrap by the instance loader.
     */
    public linkImports(imports: readonly ModuleRef[]): void {
        this.importsInternal = imports;
    }

    /**
     * @internal Advances the module to the next lifecycle state.
     * @throws {LifecycleError} If the transition is not permitted by the state machine.
     */
    public transitionTo(next: ModuleStatus): void {
        if (this.statusInternal === next) return;

        const allowed = ALLOWED_TRANSITIONS[this.statusInternal];
        if (!allowed.includes(next)) {
            throw LifecycleError.invalidModuleTransition(this.id, this.statusInternal, next);
        }

        this.statusInternal = next;
    }
}
