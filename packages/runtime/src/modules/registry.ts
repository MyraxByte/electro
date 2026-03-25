import type { Constructor } from "@electro/common";
import type { ModuleRef, ModuleStatus, ProviderRef } from "./refs";

/**
 * Serializable point-in-time view of a provider's registration state.
 * Produced by {@link ModuleRegistry.snapshot} for runtime introspection and tooling.
 */
export interface ProviderSnapshot {
    readonly id: string;
    readonly target: string;
    readonly kind: "provider" | "view" | "window";
    readonly scope: string;
    /** Bridge channels this provider exposes (commands and queries). */
    readonly bridgeChannels: readonly string[];
    /** Signal IDs this provider subscribes to. */
    readonly signalIds: readonly string[];
    /** Scheduled job IDs registered by this provider. */
    readonly jobIds: readonly string[];
}

/**
 * Serializable point-in-time view of a module's registration and lifecycle state.
 * Produced by {@link ModuleRegistry.snapshot} for runtime introspection and tooling (e.g. CLI module graph).
 */
export interface ModuleSnapshot {
    readonly id: string;
    readonly target: string;
    readonly status: ModuleStatus;
    /** IDs of modules this module imports. */
    readonly imports: readonly string[];
    /** Class names of providers this module exports. */
    readonly exports: readonly string[];
    readonly providers: readonly ProviderSnapshot[];
}

function snapshotProvider(provider: ProviderRef): ProviderSnapshot {
    const def = provider.definition;

    return {
        id: def.id,
        target: def.target.name,
        kind: def.kind,
        scope: def.scope,
        bridgeChannels: def.bridgeMethods.map((m) => m.channel),
        signalIds: def.signalHandlers.map((h) => h.signalId),
        jobIds: def.jobs.map((j) => j.jobId),
    };
}

function snapshotModule(moduleRef: ModuleRef): ModuleSnapshot {
    return {
        id: moduleRef.id,
        target: moduleRef.target.name,
        status: moduleRef.status,
        imports: moduleRef.imports.map((m) => m.id),
        exports: [...moduleRef.exportTargets].map((t) => t.name),
        providers: moduleRef.providers.map(snapshotProvider),
    };
}

/**
 * Central registry of all loaded modules in the application.
 *
 * Provides lookup by class constructor or module ID, and produces serializable
 * snapshots for runtime introspection (e.g. CLI `inspect` commands, debug tooling).
 * Populated once during bootstrap by the capability installer.
 *
 * @example
 * ```ts
 * const registry = injector.get(ModuleRegistry);
 * const snapshot = registry.snapshot(); // serializable module graph
 * ```
 */
export class ModuleRegistry {
    private readonly modulesByTarget = new Map<Constructor, ModuleRef>();
    private readonly modulesById = new Map<string, ModuleRef>();

    /** @internal Populate the registry from bootstrap. Called once by the capability installer. */
    public load(moduleRefs: readonly ModuleRef[]): void {
        for (const ref of moduleRefs) {
            this.modulesByTarget.set(ref.target, ref);
            this.modulesById.set(ref.id, ref);
        }
    }

    /** Looks up a module by its decorated class constructor. */
    public getByTarget(target: Constructor): ModuleRef | undefined {
        return this.modulesByTarget.get(target);
    }

    /** Looks up a module by its unique string identifier. */
    public getById(moduleId: string): ModuleRef | undefined {
        return this.modulesById.get(moduleId);
    }

    /** Returns all registered modules. */
    public getAll(): readonly ModuleRef[] {
        return [...this.modulesById.values()];
    }

    /** Produces a serializable snapshot of the entire module graph for introspection. */
    public snapshot(): readonly ModuleSnapshot[] {
        return this.getAll().map(snapshotModule);
    }
}
