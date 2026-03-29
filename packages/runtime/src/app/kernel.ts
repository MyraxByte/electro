import type { Constructor } from "@electrojs/common";
import { BridgeAccessGuard } from "../bridge/access-guard";
import { BridgeDispatcher } from "../bridge/dispatcher";
import { registerIpcHandlers } from "../bridge/ipc-adapter";
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
import type { FrameworkServices } from "./capability-installer";
import { connectAccessGuard, installCapabilities, installSignalRelay } from "./capability-installer";
import { CompositionRoot } from "./composition-root";
import { runDispose, runInitialization, runShutdown, runStartup } from "./lifecycle-runner";

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
    initialized: ["starting", "stopping"],
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
 * await kernel.initialize();
 * await kernel.start();
 *
 * // ... app is running ...
 *
 * await kernel.shutdown();
 * ```
 *
 * @remarks
 * - Calling {@link initialize} when already initialized is a no-op.
 * - Calling {@link start} from `idle` first performs {@link initialize} for backward compatibility.
 * - If initialization or startup fails, the kernel automatically rolls back initialized modules and
 *   transitions to `failed`.
 */
export class AppKernel {
    private state: KernelState = "idle";
    private composition?: CompositionRoot;
    private services?: FrameworkServices;
    private readonly rootModule: Constructor;
    private readonly logger: ElectroLogger;
    private readonly stateListeners: Array<(state: KernelState) => void> = [];
    private readonly disposers: Array<() => void> = [];
    private initializeTask?: Promise<void>;
    private startTask?: Promise<void>;
    private shutdownTask?: Promise<void>;

    private constructor(rootModule: Constructor, options: AppKernelOptions = {}) {
        this.rootModule = rootModule;
        this.logger = options.logger ?? createConsoleLogger();
    }

    /**
     * Creates a new kernel instance for the given root module.
     * The kernel starts in the `idle` state -- call {@link initialize} and/or {@link start} to bootstrap the application.
     */
    public static create(rootModule: Constructor, options: AppKernelOptions = {}): AppKernel {
        return new AppKernel(rootModule, options);
    }

    /**
     * Builds the application graph and runs the initialization lifecycle.
     *
     * Performs module scanning, validation, DI container creation, module instantiation,
     * capability installation, and runs `onInit`.
     *
     * @remarks Safe to call before `app.whenReady()`. No-op if already initialized or started.
     * @throws {BootstrapError} On invalid module graph or decorator metadata.
     * @throws {LifecycleError} On lifecycle hook failure.
     */
    public async initialize(): Promise<void> {
        if (this.state === "initialized" || this.state === "starting" || this.state === "started") {
            return;
        }
        if (this.initializeTask) {
            return this.initializeTask;
        }
        if (this.state !== "idle") {
            throw LifecycleError.invalidKernelTransition(this.state, "initializing");
        }

        const task = this.performInitialize();
        this.initializeTask = task;

        try {
            await task;
        } finally {
            if (this.initializeTask === task) {
                this.initializeTask = undefined;
            }
        }
    }

    /**
     * Starts the application after initialization.
     *
     * Runs `onStart` and `onReady` lifecycle hooks. Bridge calls from renderer processes
     * become available at the beginning of the `starting` phase.
     *
     * @remarks No-op if already started. Calling from `idle` first performs {@link initialize}.
     * @throws {LifecycleError} On lifecycle hook failure.
     */
    public async start(): Promise<void> {
        if (this.state === "started") return;
        if (this.startTask) {
            return this.startTask;
        }

        const task = this.performStart();
        this.startTask = task;

        try {
            await task;
        } finally {
            if (this.startTask === task) {
                this.startTask = undefined;
            }
        }
    }

    /**
     * Gracefully shuts down the application.
     *
     * Runs `onShutdown` / `onDispose` for started kernels, or only `onDispose` if the
     * kernel was initialized but never started.
     *
     * @remarks No-op if `idle`, `stopped`, or already `failed`.
     * @throws {LifecycleError} If shutdown is requested while startup is still in progress.
     */
    public async shutdown(): Promise<void> {
        if (this.state === "idle" || this.state === "stopped" || this.state === "failed") {
            return;
        }
        if (this.shutdownTask) {
            return this.shutdownTask;
        }

        const task = this.performShutdown();
        this.shutdownTask = task;

        try {
            await task;
        } finally {
            if (this.shutdownTask === task) {
                this.shutdownTask = undefined;
            }
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

    /** Returns the scanned app definition, or `undefined` if the kernel has not been initialized yet. */
    public getDefinition(): AppDefinition | undefined {
        return this.composition?.definition;
    }

    /** Returns the live module references, or an empty array if the kernel has not been initialized yet. */
    public getModuleRefs(): readonly ModuleRef[] {
        return this.composition?.moduleRefs ?? [];
    }

    /** @internal Hook for subsystems that need to react to kernel state changes. */
    public onStateChange(callback: (state: KernelState) => void): void {
        this.stateListeners.push(callback);
    }

    private async performInitialize(): Promise<void> {
        setRuntimeLogger(this.logger);
        this.transitionTo("initializing");

        try {
            this.composition = CompositionRoot.create(this.rootModule, (injector) => this.registerFrameworkServices(injector));

            installCapabilities(this.composition.moduleRefs, this.services!);
            connectAccessGuard(this.services!.bridgeAccessGuard, (cb) => this.onStateChange(cb));

            this.disposers.push(registerIpcHandlers(this.services!.bridgeDispatcher, this.services!.rendererRegistry));
            this.disposers.push(installSignalRelay(this.services!.signalBus, this.services!.rendererRegistry));

            await runInitialization(this.composition.moduleRefs);
            this.transitionTo("initialized");
        } catch (error) {
            this.transitionTo("failed");
            await this.safeDisposeServices();
            setRuntimeLogger(undefined);
            throw error;
        }
    }

    private async performStart(): Promise<void> {
        if (this.initializeTask) {
            await this.initializeTask;
        } else if (this.state === "idle") {
            await this.initialize();
        }

        if (this.state === "started") {
            return;
        }
        if (this.state !== "initialized") {
            throw LifecycleError.invalidKernelTransition(this.state, "starting");
        }

        try {
            this.transitionTo("starting");
            await runStartup(this.composition!.moduleRefs);
            this.transitionTo("started");
        } catch (error) {
            this.transitionTo("failed");
            await this.safeDisposeServices();
            setRuntimeLogger(undefined);
            throw error;
        }
    }

    private async performShutdown(): Promise<void> {
        if (this.startTask) {
            try {
                await this.startTask;
            } catch {
                return;
            }
        } else if (this.initializeTask) {
            try {
                await this.initializeTask;
            } catch {
                return;
            }
        }

        if (this.state === "idle" || this.state === "stopped" || this.state === "failed") {
            return;
        }
        if (this.state !== "initialized" && this.state !== "started") {
            throw LifecycleError.kernelNotStarted();
        }

        this.transitionTo("stopping");

        try {
            if (this.composition) {
                if (this.getPreviousRunningState() === "started") {
                    await runShutdown(this.composition.moduleRefs);
                } else {
                    await runDispose(this.composition.moduleRefs);
                }
            }

            await this.disposeServices();
            this.transitionTo("stopped");
        } catch (error) {
            this.transitionTo("failed");
            throw error;
        } finally {
            setRuntimeLogger(undefined);
        }
    }

    private getPreviousRunningState(): "initialized" | "started" {
        return this.composition?.moduleRefs.some((moduleRef) => moduleRef.status === "started") ? "started" : "initialized";
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
