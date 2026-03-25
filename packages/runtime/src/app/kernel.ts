import type { Constructor } from "@electrojs/common";
import { BridgeAccessGuard } from "../bridge/access-guard";
import { BridgeDispatcher } from "../bridge/dispatcher";
import type { Injector } from "../container/injector";
import { RendererRegistry } from "../desktop/renderer-registry";
import { ViewManager } from "../desktop/view-manager";
import { WindowManager } from "../desktop/window-manager";
import { emitDevDiagnostic } from "../diagnostics";
import { LifecycleError } from "../errors/lifecycle";
import { JobRegistry } from "../jobs/registry";
import { createConsoleLogger, setRuntimeLogger, type ElectroLogger } from "../logging";
import type { ModuleRef } from "../modules/refs";
import { ModuleRegistry } from "../modules/registry";
import type { AppDefinition } from "../modules/scanner";
import { SignalBus } from "../signals/bus";
import { registerIpcHandlers } from "../bridge/ipc-adapter";
import type { FrameworkServices } from "./capability-installer";
import { connectAccessGuard, installCapabilities, installSignalRelay } from "./capability-installer";
import { CompositionRoot } from "./composition-root";
import { runShutdown, runStartup } from "./lifecycle-runner";

/**
 * Represents the current phase of the application kernel's lifecycle.
 *
 * The state machine follows a linear progression:
 * `idle` -> `initializing` -> `initialized` -> `starting` -> `started` -> `stopping` -> `stopped`.
 * Any state except `stopped` can also transition to `failed`.
 */
export type KernelState = "idle" | "initializing" | "initialized" | "starting" | "started" | "stopping" | "stopped" | "failed";

export interface AppKernelOptions {
    readonly logger?: ElectroLogger;
}

const ALLOWED_KERNEL_TRANSITIONS: Readonly<Record<KernelState, readonly KernelState[]>> = {
    idle: ["initializing"],
    initializing: ["initialized", "failed"],
    initialized: ["starting"],
    starting: ["started", "failed"],
    started: ["stopping"],
    stopping: ["stopped", "failed"],
    stopped: [],
    failed: [],
};

/**
 * The main entry point for an `@electrojs/runtime` application.
 *
 * `AppKernel` orchestrates the full application lifecycle: scanning decorator metadata,
 * validating the module graph, creating the DI container, loading modules, installing
 * capabilities (bridge handlers, signals, jobs, desktop providers), and running
 * lifecycle hooks in the correct order.
 *
 * @example
 * ```ts
 * const kernel = AppKernel.create(AppModule);
 * await kernel.start();
 *
 * // ... app is running ...
 *
 * await kernel.shutdown();
 * ```
 *
 * @remarks
 * - Calling {@link start} when already started is a no-op.
 * - If startup fails, the kernel automatically rolls back initialized modules and
 *   transitions to `failed`.
 * - {@link shutdown} can only be called from the `started` state.
 */
export class AppKernel {
    private state: KernelState = "idle";
    private composition?: CompositionRoot;
    private services?: FrameworkServices;
    private readonly rootModule: Constructor;
    private readonly logger: ElectroLogger;
    private readonly stateListeners: Array<(state: KernelState) => void> = [];
    private readonly disposers: Array<() => void> = [];

    private constructor(rootModule: Constructor, options: AppKernelOptions = {}) {
        this.rootModule = rootModule;
        this.logger = options.logger ?? createConsoleLogger();
    }

    /**
     * Creates a new kernel instance for the given root module.
     * The kernel starts in the `idle` state -- call {@link start} to bootstrap the application.
     */
    public static create(rootModule: Constructor, options: AppKernelOptions = {}): AppKernel {
        return new AppKernel(rootModule, options);
    }

    /**
     * Bootstraps and starts the application.
     *
     * Performs module scanning, validation, DI container creation, module instantiation,
     * capability installation, and runs `onInit` / `onReady` lifecycle hooks.
     * On failure, automatically rolls back and transitions to `failed`.
     *
     * @remarks No-op if already started. Must be called from `idle` state.
     * @throws {BootstrapError} On invalid module graph or decorator metadata.
     * @throws {LifecycleError} On lifecycle hook failure.
     */
    public async start(): Promise<void> {
        if (this.state === "started") return;

        setRuntimeLogger(this.logger);
        this.transitionTo("initializing");

        try {
            this.composition = CompositionRoot.create(this.rootModule, (injector) => this.registerFrameworkServices(injector));

            installCapabilities(this.composition.moduleRefs, this.services!);
            connectAccessGuard(this.services!.bridgeAccessGuard, (cb) => this.onStateChange(cb));

            // Wire Electron IPC handlers and signal relay to renderer processes
            this.disposers.push(registerIpcHandlers(this.services!.bridgeDispatcher, this.services!.rendererRegistry));
            this.disposers.push(installSignalRelay(this.services!.signalBus, this.services!.rendererRegistry));

            this.transitionTo("initialized");

            this.transitionTo("starting");
            await runStartup(this.composition.moduleRefs);
            this.transitionTo("started");
        } catch (error) {
            this.transitionTo("failed");
            // runStartup already rolls back lifecycle hooks on failure.
            // We only need to dispose framework services (jobs, windows, views).
            await this.safeDisposeServices();
            setRuntimeLogger(undefined);
            throw error;
        }
    }

    /**
     * Gracefully shuts down the application.
     *
     * Runs `onShutdown` / `onDispose` lifecycle hooks in reverse module order,
     * then disposes framework services (jobs, windows, views).
     *
     * @remarks No-op if `idle` or already `stopped`. Throws if not in `started` state.
     * @throws {LifecycleError} If the kernel is not in the `started` state.
     */
    public async shutdown(): Promise<void> {
        if (this.state === "idle" || this.state === "stopped") return;
        if (this.state !== "started") {
            throw LifecycleError.kernelNotStarted();
        }

        this.transitionTo("stopping");

        try {
            await runShutdown(this.composition!.moduleRefs);
            await this.disposeServices();
            this.transitionTo("stopped");
        } catch (error) {
            this.transitionTo("failed");
            throw error;
        } finally {
            setRuntimeLogger(undefined);
        }
    }

    /** Returns the current kernel lifecycle state. */
    public getState(): KernelState {
        return this.state;
    }

    /** Convenience check: returns `true` only when the kernel is in the `started` state. */
    public isStarted(): boolean {
        return this.state === "started";
    }

    /** Returns the scanned app definition, or `undefined` if the kernel has not been started yet. */
    public getDefinition(): AppDefinition | undefined {
        return this.composition?.definition;
    }

    /** Returns the live module references, or an empty array if the kernel has not been started yet. */
    public getModuleRefs(): readonly ModuleRef[] {
        return this.composition?.moduleRefs ?? [];
    }

    /** @internal Hook for subsystems that need to react to kernel state changes. */
    public onStateChange(callback: (state: KernelState) => void): void {
        this.stateListeners.push(callback);
    }

    private registerFrameworkServices(injector: Injector): void {
        const signalBus = new SignalBus();
        const jobRegistry = new JobRegistry();
        const moduleRegistry = new ModuleRegistry();
        const rendererRegistry = new RendererRegistry();
        const bridgeAccessGuard = new BridgeAccessGuard();
        const bridgeDispatcher = new BridgeDispatcher(rendererRegistry, bridgeAccessGuard);
        const windowManager = new WindowManager();
        const viewManager = new ViewManager();

        injector.provideValue(SignalBus, signalBus);
        injector.provideValue(JobRegistry, jobRegistry);
        injector.provideValue(ModuleRegistry, moduleRegistry);
        injector.provideValue(RendererRegistry, rendererRegistry);
        injector.provideValue(BridgeDispatcher, bridgeDispatcher);
        injector.provideValue(BridgeAccessGuard, bridgeAccessGuard);
        injector.provideValue(WindowManager, windowManager);
        injector.provideValue(ViewManager, viewManager);

        this.services = {
            signalBus,
            jobRegistry,
            moduleRegistry,
            bridgeDispatcher,
            bridgeAccessGuard,
            windowManager,
            viewManager,
            rendererRegistry,
            logger: this.logger,
        };
    }

    private async disposeServices(): Promise<void> {
        for (const dispose of this.disposers) {
            dispose();
        }
        this.disposers.length = 0;

        await this.services?.jobRegistry.dispose();
        await this.services?.windowManager.dispose();
        await this.services?.viewManager.dispose();
    }

    private transitionTo(next: KernelState): void {
        const allowed = ALLOWED_KERNEL_TRANSITIONS[this.state];
        if (!allowed.includes(next)) {
            throw LifecycleError.invalidKernelTransition(this.state, next);
        }
        this.state = next;
        emitDevDiagnostic("AppKernel", next);
        for (const listener of this.stateListeners) {
            listener(next);
        }
    }

    private async safeDisposeServices(): Promise<void> {
        try {
            await this.disposeServices();
        } catch {
            // Dispose errors during startup failure rollback are swallowed
        }
    }
}
