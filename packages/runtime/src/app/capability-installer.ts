import { getMethodsMetadataByClass } from "@electrojs/common";
import type { BridgeAccessGuard } from "../bridge/access-guard";
import { IPC_CHANNELS } from "../bridge/client";
import type { BridgeDispatcher } from "../bridge/dispatcher";
import { BridgeHandler } from "../bridge/handler";
import { InjectionContext } from "../container/injection-context";
import type { RendererRegistry } from "../desktop/renderer-registry";
import type { ViewManager } from "../desktop/view-manager";
import type { WindowManager } from "../desktop/window-manager";
import type { JobRegistry } from "../jobs/registry";
import { resolveDiagnosticTarget, type ElectroLogger } from "../logging";
import type { ModuleRef, ProviderRef } from "../modules/refs";
import type { ModuleRegistry } from "../modules/registry";
import type { SignalBus } from "../signals/bus";
import type { KernelState } from "./kernel";

/**
 * Aggregates all framework-level singleton services created during kernel initialization.
 * Passed to {@link installCapabilities} to wire providers to their respective subsystems.
 *
 * @internal
 */
export interface FrameworkServices {
    readonly moduleRegistry: ModuleRegistry;
    readonly signalBus: SignalBus;
    readonly jobRegistry: JobRegistry;
    readonly bridgeDispatcher: BridgeDispatcher;
    readonly bridgeAccessGuard: BridgeAccessGuard;
    readonly windowManager: WindowManager;
    readonly viewManager: ViewManager;
    readonly rendererRegistry: RendererRegistry;
    readonly logger: ElectroLogger;
}

/**
 * Wires all provider capabilities to the corresponding framework services.
 *
 * Iterates every provider in every module and installs:
 * - **Bridge handlers** into the `BridgeDispatcher` (IPC commands/queries)
 * - **Signal handlers** into the `SignalBus`
 * - **Job handlers** into the `JobRegistry`
 * - **Desktop providers** into `WindowManager`, `ViewManager`, and `RendererRegistry`
 *
 * Also populates the `ModuleRegistry` with all loaded module refs for introspection.
 *
 * @internal Called once by {@link AppKernel.initialize} after module loading, before lifecycle hooks.
 */
export function installCapabilities(moduleRefs: readonly ModuleRef[], services: FrameworkServices): void {
    services.moduleRegistry.load(moduleRefs);

    for (const moduleRef of moduleRefs) {
        installAuthoringApi(moduleRef, services);

        for (const providerRef of moduleRef.providers) {
            installBridgeHandlers(providerRef, services.bridgeDispatcher);
            installSignalHandlers(providerRef, services.signalBus);
            installJobHandlers(providerRef, services.jobRegistry);
            installDesktopProviders(providerRef, services.windowManager, services.viewManager, services.rendererRegistry);
        }
    }
}

function defineAuthoringGetter(target: object, key: string, getter: () => unknown): void {
    if (key in target) return;

    Object.defineProperty(target, key, {
        configurable: true,
        enumerable: false,
        get: getter,
    });
}

function createModuleApi(moduleRef: ModuleRef): Record<string, (...args: unknown[]) => unknown> {
    const api: Record<string, (...args: unknown[]) => unknown> = {};

    for (const methodMeta of getMethodsMetadataByClass(moduleRef.target)) {
        if (methodMeta.kind !== "command" && methodMeta.kind !== "query") continue;

        const method = Reflect.get(moduleRef.instance as object, methodMeta.methodName);
        if (typeof method === "function") {
            api[methodMeta.id] = method.bind(moduleRef.instance);
        }
    }

    for (const providerRef of moduleRef.providers) {
        for (const bridgeDef of providerRef.definition.bridgeMethods) {
            const method = providerRef.getMethod(bridgeDef.methodName);
            if (!method) continue;

            api[bridgeDef.channel.slice(`${moduleRef.id}:`.length)] = method.bind(providerRef.instance);
        }
    }

    return api;
}

function installModuleAuthoringTarget(
    target: object,
    moduleRef: ModuleRef,
    moduleApi: Record<string, (...args: unknown[]) => unknown>,
    services: FrameworkServices,
): void {
    const logger = services.logger.child({ target: resolveDiagnosticTarget(target, moduleRef.id) });

    defineAuthoringGetter(target, "moduleId", () => moduleRef.id);
    defineAuthoringGetter(target, "api", () => moduleApi);
    defineAuthoringGetter(target, "signals", () => services.signalBus);
    defineAuthoringGetter(target, "jobs", () => services.jobRegistry);
    defineAuthoringGetter(target, "modules", () => services.moduleRegistry);
    defineAuthoringGetter(target, "windows", () => services.windowManager);
    defineAuthoringGetter(target, "views", () => services.viewManager);
    defineAuthoringGetter(target, "logger", () => logger);
}

function installAuthoringApi(moduleRef: ModuleRef, services: FrameworkServices): void {
    const moduleApi = createModuleApi(moduleRef);

    installModuleAuthoringTarget(moduleRef.instance as object, moduleRef, moduleApi, services);

    for (const providerRef of moduleRef.providers) {
        installModuleAuthoringTarget(providerRef.instance as object, moduleRef, moduleApi, services);
    }
}

/**
 * Connects the bridge access guard to kernel state transitions so it can
 * block or allow IPC calls based on whether the kernel is fully started.
 *
 * @internal Called once by {@link AppKernel.initialize} after capability installation.
 */
export function connectAccessGuard(accessGuard: BridgeAccessGuard, onStateChange: (callback: (state: KernelState) => void) => void): void {
    onStateChange((state) => accessGuard.setKernelState(state));
}

function installBridgeHandlers(providerRef: ProviderRef, dispatcher: BridgeDispatcher): void {
    for (const bridgeDef of providerRef.definition.bridgeMethods) {
        const method = providerRef.getMethod(bridgeDef.methodName);
        if (!method) continue;

        const invoker = method.bind(providerRef.instance);
        const handler = new BridgeHandler(bridgeDef, invoker, providerRef.injector);
        dispatcher.registerHandler(handler);
    }
}

function installSignalHandlers(providerRef: ProviderRef, signalBus: SignalBus): void {
    for (const signalDef of providerRef.definition.signalHandlers) {
        const method = providerRef.getMethod(signalDef.methodName);
        if (!method) continue;

        const bound = method.bind(providerRef.instance);

        // Subscribe within injection context so handler can use inject()
        InjectionContext.run(providerRef.injector, () => {
            signalBus.subscribe(signalDef.signalId, bound as (...args: unknown[]) => void);
        });
    }
}

function installJobHandlers(providerRef: ProviderRef, jobRegistry: JobRegistry): void {
    for (const jobDef of providerRef.definition.jobs) {
        const method = providerRef.getMethod(jobDef.methodName);
        if (!method) continue;

        const bound = method.bind(providerRef.instance);

        jobRegistry.register({
            jobId: jobDef.jobId,
            cron: jobDef.cron,
            handler: bound as (context: import("../jobs/context").JobContext, ...args: unknown[]) => unknown,
            injector: providerRef.injector,
        });
    }
}

/**
 * Connects the signal bus relay to the renderer registry so that signals
 * published on the main process are forwarded to renderer processes that
 * have opted in via `@View({ signals: [...] })`.
 *
 * @internal Called once by {@link AppKernel.initialize} after capability installation.
 */
export function installSignalRelay(signalBus: SignalBus, rendererRegistry: RendererRegistry): () => void {
    return signalBus.connectRelay((signalId, payload) => {
        const electron = require("electron") as typeof import("electron");

        for (const session of rendererRegistry.getAllSessions()) {
            if (session.canReceiveSignal(signalId)) {
                electron.webContents.fromId(session.rendererId)?.send(IPC_CHANNELS.signal, {
                    signalId,
                    payload,
                });
            }
        }
    });
}

function installDesktopProviders(providerRef: ProviderRef, windowManager: WindowManager, viewManager: ViewManager, rendererRegistry: RendererRegistry): void {
    if (providerRef.definition.kind === "window") {
        windowManager.register(providerRef);
    }
    if (providerRef.definition.kind === "view") {
        viewManager.register(providerRef);

        if (providerRef.definition.view) {
            rendererRegistry.registerView(providerRef.definition.view);
        }
    }
}
