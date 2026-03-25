/**
 * Public type contracts for `@electro/runtime`.
 *
 * This module re-exports every public-facing type from the runtime's subsystems
 * as a single, flat surface. Consumers that only need types (no runtime values)
 * can import exclusively from `@electro/runtime` — the barrel re-exports these
 * with `export type`.
 *
 * @example
 * ```ts
 * import type { KernelState, ModuleSnapshot, JobStatus } from "@electro/runtime";
 * ```
 *
 * @module contracts
 */

import type { AppKernelOptions, KernelState } from "../app/kernel";
import type { BridgeRequest, BridgeResponse } from "../bridge/dispatcher";
import type { JobRuntimeState, JobStatus } from "../jobs/registry";
import type { ElectroLogBindings, ElectroLogContext, ElectroLogLevel, ElectroLogger } from "../logging";
import type { LifecycleTarget, ModuleStatus } from "../modules/refs";
import type { ModuleSnapshot, ProviderSnapshot } from "../modules/registry";
import type {
    AppDefinition,
    BridgeMethodDefinition,
    BridgeMethodKind,
    JobDefinition,
    ModuleDefinition,
    ProviderDefinition,
    ProviderKind,
    SignalHandlerDefinition,
    ViewDefinition,
    WindowDefinition,
} from "../modules/scanner";
import type { ContextualSignalHandler, SignalHandler, SignalListener } from "../signals/bus";

export type {
    // ── Modules — static definitions ──────────────────────────────────────

    /** Complete static description of the application's module graph, produced by {@link scanModules}. */
    AppDefinition,
    /** Static metadata for a single `@command` or `@query` bridge method. */
    BridgeMethodDefinition,
    /** Discriminant for bridge method kind: `"command"` or `"query"`. */
    BridgeMethodKind,
    // ── Bridge ────────────────────────────────────────────────────────────

    /** Incoming IPC request from a renderer process. */
    BridgeRequest,
    /** Outgoing IPC response sent back to a renderer process. */
    BridgeResponse,
    /** Signal callback that also receives a {@link SignalContext} as its first argument. */
    ContextualSignalHandler,
    /** Static metadata for a `@job`-decorated method. */
    JobDefinition,
    /** Read-only snapshot of a job's current runtime state. */
    JobRuntimeState,
    // ── Jobs ──────────────────────────────────────────────────────────────

    /** Lifecycle state of a registered job: `"idle"`, `"scheduled"`, or `"running"`. */
    JobStatus,
    // ── App ────────────────────────────────────────────────────────────────

    /** Current phase of the {@link AppKernel} lifecycle state machine. */
    AppKernelOptions,
    /** Current phase of the {@link AppKernel} lifecycle state machine. */
    KernelState,
    /** Structured bindings attached to a child logger. */
    ElectroLogBindings,
    /** Structured context object attached to a log line. */
    ElectroLogContext,
    /** Standard log levels supported by the runtime logger contract. */
    ElectroLogLevel,
    /** Logger contract accepted by {@link AppKernel.create}. */
    ElectroLogger,
    // ── Modules — runtime ─────────────────────────────────────────────────

    /** Interface that module and provider instances may implement for lifecycle hooks. */
    LifecycleTarget,
    /** Static metadata for a single `@Module`-decorated class. */
    ModuleDefinition,
    /** Serializable snapshot of a module's runtime state, returned by {@link ModuleRegistry.snapshot}. */
    ModuleSnapshot,
    /** Runtime status of a module: `"creating"` → `"ready"` → `"started"` → `"stopping"` → `"stopped"` | `"failed"`. */
    ModuleStatus,
    /** Static metadata for a single `@Injectable`/`@View`/`@Window`-decorated provider. */
    ProviderDefinition,
    /** Discriminant for the kind of provider: `"provider"`, `"view"`, or `"window"`. */
    ProviderKind,
    /** Serializable snapshot of a provider's runtime state within a {@link ModuleSnapshot}. */
    ProviderSnapshot,
    // ── Signals ───────────────────────────────────────────────────────────

    /** Union of supported handler signatures for {@link SignalBus.subscribe}. */
    SignalHandler,
    /** Static metadata for a `@signal` handler method. */
    SignalHandlerDefinition,
    /** Simple signal callback that receives only the payload. */
    SignalListener,
    /** Static metadata for a `@View`-decorated provider. */
    ViewDefinition,
    /** Static metadata for a `@Window`-decorated provider. */
    WindowDefinition,
};
