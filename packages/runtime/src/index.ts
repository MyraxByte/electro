/**
 * `@electro/runtime` — framework-core package for Electron applications.
 *
 * This is the main entry point for the runtime. All public classes, functions,
 * error types, and type contracts are re-exported from here so consumers can
 * use a single import path:
 *
 * ```ts
 * import { AppKernel, inject, SignalBus, WindowProvider } from "@electro/runtime";
 * import type { KernelState, ModuleSnapshot } from "@electro/runtime";
 * ```
 *
 * @packageDocumentation
 */

// ── App ───────────────────────────────────────────────────────────────────────

export { AppKernel } from "./app/kernel";

// ── Container ─────────────────────────────────────────────────────────────────

export { inject } from "./container/inject";
export { InjectionContext } from "./container/injection-context";
export { Injector } from "./container/injector";

// ── Modules ───────────────────────────────────────────────────────────────────

export { ModuleRef, ProviderRef } from "./modules/refs";
export { ModuleRegistry } from "./modules/registry";
export { scanModules } from "./modules/scanner";
export { validateAppDefinition } from "./modules/validator";

// ── Signals ───────────────────────────────────────────────────────────────────

export { SignalBus } from "./signals/bus";
export { SignalContext } from "./signals/context";

// ── Logging ──────────────────────────────────────────────────────────────────

export { createConsoleLogger } from "./logging";

// ── Jobs ──────────────────────────────────────────────────────────────────────

export { JobContext } from "./jobs/context";
export { JobRegistry } from "./jobs/registry";

// ── Desktop ───────────────────────────────────────────────────────────────────

export { RendererRegistry } from "./desktop/renderer-registry";
export { RendererSession } from "./desktop/renderer-session";
export { ViewManager } from "./desktop/view-manager";
export { ViewProvider } from "./desktop/view-provider";
export { WindowManager } from "./desktop/window-manager";
export { WindowProvider } from "./desktop/window-provider";

// ── Bridge ────────────────────────────────────────────────────────────────────

export { BridgeAccessGuard } from "./bridge/access-guard";
export { createBridgeClient, IPC_CHANNELS } from "./bridge/client";
export { BridgeDispatcher } from "./bridge/dispatcher";
export { BridgeHandler } from "./bridge/handler";
export { serializeBridgeError } from "./bridge/serializer";

// ── Errors ────────────────────────────────────────────────────────────────────

export { BootstrapError } from "./errors/bootstrap";
export { BridgeError } from "./errors/bridge";
export { DIError } from "./errors/di";
export { JobError } from "./errors/job";
export { LifecycleError } from "./errors/lifecycle";
export { RuntimeError } from "./errors/runtime";
export { SignalError } from "./errors/signal";

// ── Contracts (re-exported types) ─────────────────────────────────────────────

export type {
    AppKernelOptions,
    AppDefinition,
    BridgeMethodDefinition,
    BridgeMethodKind,
    BridgeRequest,
    BridgeResponse,
    ContextualSignalHandler,
    JobDefinition,
    JobRuntimeState,
    JobStatus,
    KernelState,
    LifecycleTarget,
    ModuleDefinition,
    ModuleSnapshot,
    ModuleStatus,
    ProviderDefinition,
    ProviderKind,
    ProviderSnapshot,
    ElectroLogBindings,
    ElectroLogContext,
    ElectroLogLevel,
    ElectroLogger,
    SignalHandler,
    SignalHandlerDefinition,
    SignalListener,
    ViewDefinition,
    WindowDefinition,
} from "./contracts/types";

// ── Authoring contracts (used by codegen-generated type augmentations) ────────

export type {
    AppKernelDefinition,
    InjectableClassRegistry,
    ModuleApiRegistry,
    ModuleAuthoringApi,
    ModuleClass,
    ModuleJobRegistry,
    ModuleMethodMap,
    ModuleRegistryId,
    ModuleSignalPayloadMap,
    TypedJobRegistry,
    TypedSignalBus,
    ViewAuthoringApi,
    ViewClass,
    ViewClassRegistry,
    WindowAuthoringApi,
    WindowClass,
    WindowClassRegistry,
} from "./contracts/authoring";

export type { BridgeClientConfig, ElectroIpcRenderer, PreloadBridgeApi } from "./bridge/client";
