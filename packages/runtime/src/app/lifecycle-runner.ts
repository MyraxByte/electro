import { InjectionContext } from "../container/injection-context";
import type { Injector } from "../container/injector";
import { emitDevDiagnostic, emitTargetError } from "../diagnostics";
import { LifecycleError } from "../errors/lifecycle";
import type { LifecycleTarget, ModuleRef } from "../modules/refs";

type InitializationHook = "onInit";
type StartupHook = "onStart" | "onReady";
type ShutdownHook = "onShutdown" | "onDispose";

function hasHook(target: LifecycleTarget, hook: string): boolean {
    return typeof (target as Record<string, unknown>)[hook] === "function";
}

function getLifecycleLabel(target: LifecycleTarget, fallback: string): string {
    const name = target.constructor?.name?.trim();
    return name && name.length > 0 ? name : fallback;
}

async function callInitializationHook(target: LifecycleTarget, hook: InitializationHook, injector: Injector): Promise<void> {
    if (!hasHook(target, hook)) return;

    try {
        await InjectionContext.run(injector, () => target[hook]!());
    } catch (error) {
        emitTargetError(target, `${hook} failed`, error);
        throw LifecycleError.startupFailed(hook, target.constructor.name, error);
    }
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
 * Executes the initialization sequence across all modules.
 *
 * Calls `onInit` on each module's providers and then the module itself, in
 * dependency-first order. Successfully initialized modules transition to `ready`.
 *
 * If any hook throws, already-initialized modules receive `onDispose` in reverse
 * order before the error is re-thrown.
 *
 * @internal
 */
export async function runInitialization(moduleRefs: readonly ModuleRef[]): Promise<void> {
    const initializedModules: ModuleRef[] = [];

    try {
        for (const moduleRef of moduleRefs) {
            const label = getLifecycleLabel(moduleRef.instance, moduleRef.id);
            emitDevDiagnostic(label, "initializing");
            for (const providerRef of moduleRef.providers) {
                await callInitializationHook(providerRef.instance, "onInit", providerRef.injector);
            }

            await callInitializationHook(moduleRef.instance, "onInit", moduleRef.injector);
            moduleRef.transitionTo("ready");
            emitDevDiagnostic(label, "initialized");
            initializedModules.push(moduleRef);
        }
    } catch (error) {
        markFailed(moduleRefs);
        await runDispose(initializedModules);
        throw error;
    }
}

/**
 * Executes the startup sequence across all initialized modules.
 *
 * **Phase 1 (start):** Calls `onStart` on each module's providers and then the module
 * itself, in dependency-first order.
 *
 * **Phase 2 (ready):** Calls `onReady` on each module's providers and then the module
 * itself, in the same order. Transitions each module to `started`.
 *
 * If any hook throws, modules that completed `onStart` receive `onShutdown`, and
 * all initialized modules receive `onDispose` (both in reverse order), before the
 * error is re-thrown.
 *
 * @internal
 */
export async function runStartup(moduleRefs: readonly ModuleRef[]): Promise<void> {
    const startedModules: ModuleRef[] = [];

    try {
        for (const moduleRef of moduleRefs) {
            const label = getLifecycleLabel(moduleRef.instance, moduleRef.id);
            emitDevDiagnostic(label, "starting");
            for (const providerRef of moduleRef.providers) {
                await callStartupHook(providerRef.instance, "onStart", providerRef.injector);
            }

            await callStartupHook(moduleRef.instance, "onStart", moduleRef.injector);
            startedModules.push(moduleRef);
        }

        for (const moduleRef of moduleRefs) {
            for (const providerRef of moduleRef.providers) {
                await callStartupHook(providerRef.instance, "onReady", providerRef.injector);
            }

            await callStartupHook(moduleRef.instance, "onReady", moduleRef.injector);
            moduleRef.transitionTo("started");
            emitDevDiagnostic(getLifecycleLabel(moduleRef.instance, moduleRef.id), "started");
        }
    } catch (error) {
        markFailed(moduleRefs);
        await runStop(startedModules);
        await runDispose(moduleRefs);
        throw error;
    }
}

/**
 * Executes the two-phase shutdown sequence across all started modules in reverse dependency order.
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

    for (const moduleRef of reversed) {
        const label = getLifecycleLabel(moduleRef.instance, moduleRef.id);
        emitDevDiagnostic(label, "stopping");
        await callShutdownHook(moduleRef.instance, "onShutdown", moduleRef.injector);

        for (const providerRef of [...moduleRef.providers].reverse()) {
            await callShutdownHook(providerRef.instance, "onShutdown", providerRef.injector);
        }

        moduleRef.transitionTo("stopping");
    }

    await runDispose(moduleRefs);
}

export async function runDispose(moduleRefs: readonly ModuleRef[]): Promise<void> {
    for (const moduleRef of [...moduleRefs].reverse()) {
        const label = getLifecycleLabel(moduleRef.instance, moduleRef.id);
        await callShutdownHook(moduleRef.instance, "onDispose", moduleRef.injector);

        for (const providerRef of [...moduleRef.providers].reverse()) {
            await callShutdownHook(providerRef.instance, "onDispose", providerRef.injector);
        }

        if (moduleRef.status !== "failed" && moduleRef.status !== "stopped") {
            moduleRef.transitionTo("stopped");
            emitDevDiagnostic(label, "stopped");
        }
    }
}

async function runStop(moduleRefs: readonly ModuleRef[]): Promise<void> {
    for (const moduleRef of [...moduleRefs].reverse()) {
        await callShutdownHook(moduleRef.instance, "onShutdown", moduleRef.injector);

        for (const providerRef of [...moduleRef.providers].reverse()) {
            await callShutdownHook(providerRef.instance, "onShutdown", providerRef.injector);
        }
    }
}

function markFailed(moduleRefs: readonly ModuleRef[]): void {
    for (const moduleRef of moduleRefs) {
        if (moduleRef.status === "stopped" || moduleRef.status === "failed") {
            continue;
        }

        try {
            moduleRef.transitionTo("failed");
            emitDevDiagnostic(getLifecycleLabel(moduleRef.instance, moduleRef.id), "failed", "error");
        } catch {
            // Status transition may not be allowed — skip
        }
    }
}
