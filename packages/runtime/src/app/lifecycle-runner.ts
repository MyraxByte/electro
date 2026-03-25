import { InjectionContext } from "../container/injection-context";
import type { Injector } from "../container/injector";
import { emitDevDiagnostic, emitTargetError } from "../diagnostics";
import { LifecycleError } from "../errors/lifecycle";
import type { LifecycleTarget, ModuleRef } from "../modules/refs";

type StartupHook = "onInit" | "onReady";
type ShutdownHook = "onShutdown" | "onDispose";

function hasHook(target: LifecycleTarget, hook: string): boolean {
    return typeof (target as Record<string, unknown>)[hook] === "function";
}

function getLifecycleLabel(target: LifecycleTarget, fallback: string): string {
    const name = target.constructor?.name?.trim();
    return name && name.length > 0 ? name : fallback;
}

async function callStartupHook(target: LifecycleTarget, hook: StartupHook, injector: Injector): Promise<void> {
    if (!hasHook(target, hook)) return;

    try {
        await InjectionContext.run(injector, () => target[hook]!());
    } catch (error) {
        emitTargetError(target, `${hook} failed`, error);
        throw LifecycleError.startupFailed(hook, target.constructor.name, error);
    }
}

async function callShutdownHook(target: LifecycleTarget, hook: ShutdownHook, injector: Injector): Promise<void> {
    if (!hasHook(target, hook)) return;

    try {
        await InjectionContext.run(injector, () => target[hook]!());
    } catch (error) {
        emitTargetError(target, `${hook} failed`, error);
    }
}

/**
 * Executes the two-phase startup sequence across all modules.
 *
 * **Phase 1 (init):** Calls `onInit` on each module's providers and then the module
 * itself, in dependency-first order. Transitions each module to `ready`.
 *
 * **Phase 2 (ready):** Calls `onReady` on each module's providers and then the module
 * itself, in the same order. Transitions each module to `started`.
 *
 * If any hook throws, already-started modules receive `onShutdown` and all initialized
 * modules receive `onDispose` (both in reverse order) before the error is re-thrown.
 *
 * @internal
 */
export async function runStartup(moduleRefs: readonly ModuleRef[]): Promise<void> {
    const initializedModules: ModuleRef[] = [];
    const startedModules: ModuleRef[] = [];

    try {
        // Phase 1: onInit for all modules (per-module grouped, dependency-first)
        for (const moduleRef of moduleRefs) {
            const label = getLifecycleLabel(moduleRef.instance, moduleRef.id);
            emitDevDiagnostic(label, "initializing");
            for (const providerRef of moduleRef.providers) {
                await callStartupHook(providerRef.instance, "onInit", providerRef.injector);
            }

            await callStartupHook(moduleRef.instance, "onInit", moduleRef.injector);
            moduleRef.transitionTo("ready");
            emitDevDiagnostic(label, "initialized");
            initializedModules.push(moduleRef);
        }

        // Phase 2: onReady for all modules (per-module grouped, dependency-first)
        for (const moduleRef of moduleRefs) {
            const label = getLifecycleLabel(moduleRef.instance, moduleRef.id);
            emitDevDiagnostic(label, "starting");
            for (const providerRef of moduleRef.providers) {
                await callStartupHook(providerRef.instance, "onReady", providerRef.injector);
            }

            await callStartupHook(moduleRef.instance, "onReady", moduleRef.injector);
            moduleRef.transitionTo("started");
            emitDevDiagnostic(label, "started");
            startedModules.push(moduleRef);
        }
    } catch (error) {
        // Transition failed modules to "failed"
        for (const moduleRef of moduleRefs) {
            if (moduleRef.status !== "stopped" && moduleRef.status !== "failed") {
                try {
                    moduleRef.transitionTo("failed");
                    emitDevDiagnostic(getLifecycleLabel(moduleRef.instance, moduleRef.id), "failed", "error");
                } catch {
                    // Status transition may not be allowed — skip
                }
            }
        }

        // Rollback: onShutdown for started modules, onDispose for all initialized (reverse order)
        for (const moduleRef of [...startedModules].reverse()) {
            await callShutdownHook(moduleRef.instance, "onShutdown", moduleRef.injector);
            for (const providerRef of [...moduleRef.providers].reverse()) {
                await callShutdownHook(providerRef.instance, "onShutdown", providerRef.injector);
            }
        }
        for (const moduleRef of [...initializedModules].reverse()) {
            await callShutdownHook(moduleRef.instance, "onDispose", moduleRef.injector);
            for (const providerRef of [...moduleRef.providers].reverse()) {
                await callShutdownHook(providerRef.instance, "onDispose", providerRef.injector);
            }
        }

        throw error;
    }
}

/**
 * Executes the two-phase shutdown sequence across all modules in reverse dependency order.
 *
 * **Phase 1 (shutdown):** Calls `onShutdown` on each module and its providers (reverse order).
 * Transitions each module to `stopping`.
 *
 * **Phase 2 (dispose):** Calls `onDispose` on each module and its providers (reverse order).
 * Transitions each module to `stopped`.
 *
 * @remarks Errors in shutdown hooks are logged but do not prevent remaining hooks from running.
 * @internal
 */
export async function runShutdown(moduleRefs: readonly ModuleRef[]): Promise<void> {
    const reversed = [...moduleRefs].reverse();

    // Phase 1: onShutdown (reverse module order)
    for (const moduleRef of reversed) {
        const label = getLifecycleLabel(moduleRef.instance, moduleRef.id);
        emitDevDiagnostic(label, "stopping");
        await callShutdownHook(moduleRef.instance, "onShutdown", moduleRef.injector);

        for (const providerRef of [...moduleRef.providers].reverse()) {
            await callShutdownHook(providerRef.instance, "onShutdown", providerRef.injector);
        }

        moduleRef.transitionTo("stopping");
    }

    // Phase 2: onDispose (reverse module order)
    for (const moduleRef of reversed) {
        const label = getLifecycleLabel(moduleRef.instance, moduleRef.id);
        await callShutdownHook(moduleRef.instance, "onDispose", moduleRef.injector);

        for (const providerRef of [...moduleRef.providers].reverse()) {
            await callShutdownHook(providerRef.instance, "onDispose", providerRef.injector);
        }

        moduleRef.transitionTo("stopped");
        emitDevDiagnostic(label, "stopped");
    }
}
