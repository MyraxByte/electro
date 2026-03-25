import type { Constructor, MethodMetadata, ProviderScope } from "@electrojs/common";
import { getInjectableMetadata, getMethodsMetadataByClass, getModuleMetadata, getViewMetadata, getWindowMetadata, Ref } from "@electrojs/common";
import { BootstrapError } from "../errors/bootstrap";

// --- Static Definition Types (serializable for tooling) ---

/** Discriminates the role of a provider: plain service, renderer view, or window host. */
export type ProviderKind = "provider" | "view" | "window";

/** Discriminates bridge method semantics: commands mutate state, queries are read-only. */
export type BridgeMethodKind = "command" | "query";

/**
 * Static, serializable description of a module extracted from `@Module()` decorator metadata.
 * This is the first layer of the two-layer entity model -- it captures the declaration
 * without instantiating anything, making it suitable for static analysis and tooling.
 */
export interface ModuleDefinition {
    /** Unique module identifier, derived from the class name or explicit `@Module({ id })`. */
    readonly id: string;
    /** The decorated module class constructor. */
    readonly target: Constructor;
    /** Module constructors this module imports (resolved from `@Module({ imports })`). */
    readonly imports: readonly Constructor[];
    /** Runtime-managed declarations declared in this module, fully scanned with capabilities. */
    readonly providers: readonly ProviderDefinition[];
    /** Provider constructors this module exports to importers. */
    readonly exportTargets: readonly Constructor[];
}

/**
 * Static description of a provider (service, view, or window) within a module.
 * Aggregates all capability metadata (bridge methods, signal handlers, jobs) discovered
 * from the provider's decorated methods.
 */
export interface ProviderDefinition {
    /** Provider identifier, defaults to the class name. */
    readonly id: string;
    readonly target: Constructor;
    /** ID of the module that owns this provider. */
    readonly ownerModuleId: string;
    readonly scope: ProviderScope;
    readonly kind: ProviderKind;
    /** Present only if the provider is decorated with `@View()`. */
    readonly view?: ViewDefinition;
    /** Present only if the provider is decorated with `@Window()`. */
    readonly window?: WindowDefinition;
    /** Bridge command/query methods exposed by this provider. */
    readonly bridgeMethods: readonly BridgeMethodDefinition[];
    /** Signal subscriptions declared by this provider. */
    readonly signalHandlers: readonly SignalHandlerDefinition[];
    /** Scheduled jobs declared by this provider. */
    readonly jobs: readonly JobDefinition[];
}

/**
 * Static description of a renderer view, extracted from `@View()` decorator metadata.
 * Views represent web content (HTML pages or routes) rendered inside a `BrowserWindow`.
 */
export interface ViewDefinition {
    readonly id: string;
    readonly ownerModuleId: string;
    /** Path or URL to the HTML/renderer entry for this view. */
    readonly source: string;
    /** Bridge channels this view is allowed to invoke (allowlist for access control). */
    readonly access: readonly string[];
    /** Signal IDs this view is allowed to receive. */
    readonly signals: readonly string[];
    readonly target: Constructor;
    /** Optional Electron configuration from `@View({ configuration })` (webPreferences, etc). */
    readonly configuration?: { readonly webPreferences?: import("electron").WebPreferences };
}

/**
 * Static description of an Electron `BrowserWindow` host, extracted from `@Window()` decorator metadata.
 */
export interface WindowDefinition {
    readonly id: string;
    readonly ownerModuleId: string;
    readonly target: Constructor;
    /** Optional Electron `BrowserWindow` configuration overrides. */
    readonly configuration?: object;
}

/**
 * Static description of a bridge method (IPC handler) exposed to the renderer process.
 * Channel names are derived as `moduleId:methodId`.
 */
export interface BridgeMethodDefinition {
    /** Fully qualified IPC channel name (`moduleId:methodId`). */
    readonly channel: string;
    readonly kind: BridgeMethodKind;
    readonly moduleId: string;
    readonly providerName: string;
    /** Name of the method on the provider class that handles this channel. */
    readonly methodName: string;
}

/**
 * Static description of a signal handler that subscribes to an application signal.
 * Signal IDs come from the `@signal()` decorator's `id` option, or default to the method name.
 */
export interface SignalHandlerDefinition {
    /** Signal identifier this handler subscribes to (from `@signal({ id })` or method name). */
    readonly signalId: string;
    readonly moduleId: string;
    readonly providerName: string;
    /** Name of the method on the provider class that handles this signal. */
    readonly methodName: string;
}

/**
 * Static description of a scheduled job declared via `@Job()` decorator.
 */
export interface JobDefinition {
    /** Fully qualified job identifier (`moduleId:methodId`). */
    readonly jobId: string;
    readonly moduleId: string;
    readonly providerName: string;
    /** Name of the method on the provider class that executes this job. */
    readonly methodName: string;
    /** Optional cron expression for recurring execution. */
    readonly cron?: string;
}

/**
 * Complete static description of an application's module graph and all capabilities.
 *
 * This is the top-level output of {@link scanModules} and the first layer of the
 * two-layer entity model. It is fully serializable (except `target` constructor
 * references) for use by CLI tooling, validation, and static analysis.
 */
export interface AppDefinition {
    /** The root module constructor that was passed to {@link scanModules}. */
    readonly rootModule: Constructor;
    /** All discovered modules in traversal order (root-first). */
    readonly modules: readonly ModuleDefinition[];
    /** All providers across all modules. */
    readonly providers: readonly ProviderDefinition[];
    /** All views across all modules. */
    readonly views: readonly ViewDefinition[];
    /** All windows across all modules. */
    readonly windows: readonly WindowDefinition[];
    /** All bridge methods (commands and queries) across all providers. */
    readonly bridgeMethods: readonly BridgeMethodDefinition[];
    /** All signal handlers across all providers. */
    readonly signalHandlers: readonly SignalHandlerDefinition[];
    /** All scheduled jobs across all providers. */
    readonly jobs: readonly JobDefinition[];
}

// --- Scanner ---

function deriveModuleId(target: Constructor): string {
    const metadata = getModuleMetadata(target);
    if (metadata?.id) return metadata.id;

    const name = target.name;
    return name.endsWith("Module") ? name.slice(0, -6).toLowerCase() : name.toLowerCase();
}

function buildBridgeChannel(moduleId: string, methodMeta: MethodMetadata): string {
    return `${moduleId}:${methodMeta.id}`;
}

function buildSignalId(_moduleId: string, methodMeta: MethodMetadata): string {
    return methodMeta.id;
}

function buildJobId(moduleId: string, methodMeta: MethodMetadata): string {
    return `${moduleId}:${methodMeta.id}`;
}

function scanProviderMethods(
    moduleId: string,
    providerTarget: Constructor,
    providerName: string,
): {
    bridgeMethods: BridgeMethodDefinition[];
    signalHandlers: SignalHandlerDefinition[];
    jobs: JobDefinition[];
} {
    const methods = getMethodsMetadataByClass(providerTarget);
    const bridgeMethods: BridgeMethodDefinition[] = [];
    const signalHandlers: SignalHandlerDefinition[] = [];
    const jobs: JobDefinition[] = [];

    for (const method of methods) {
        switch (method.kind) {
            case "command":
            case "query":
                bridgeMethods.push({
                    channel: buildBridgeChannel(moduleId, method),
                    kind: method.kind,
                    moduleId,
                    providerName,
                    methodName: method.methodName,
                });
                break;
            case "signal":
                signalHandlers.push({
                    signalId: buildSignalId(moduleId, method),
                    moduleId,
                    providerName,
                    methodName: method.methodName,
                });
                break;
            case "job":
                jobs.push({
                    jobId: buildJobId(moduleId, method),
                    moduleId,
                    providerName,
                    methodName: method.methodName,
                    cron: method.cron,
                });
                break;
        }
    }

    return { bridgeMethods, signalHandlers, jobs };
}

/**
 * Recursively walks the module graph starting from `rootModule`, reading `@Module()`,
 * `@Injectable()`, `@View()`, `@Window()`, and method decorators to produce a complete
 * {@link AppDefinition}.
 *
 * This is a pure metadata read -- no instances are created. The resulting definition
 * is passed to {@link validateAppDefinition} and then to the instance loader.
 *
 * @throws {BootstrapError} If a module or provider is missing required decorator metadata,
 *   or if an imported class is not a valid module.
 */
export function scanModules(rootModule: Constructor): AppDefinition {
    const moduleMap = new Map<Constructor, ModuleDefinition>();
    const allProviders: ProviderDefinition[] = [];
    const allViews: ViewDefinition[] = [];
    const allWindows: WindowDefinition[] = [];

    const visit = (target: Constructor): void => {
        if (moduleMap.has(target)) return;

        const moduleMeta = getModuleMetadata(target);
        if (!moduleMeta) {
            throw BootstrapError.rootModuleNotDecorated(target.name);
        }

        const moduleId = deriveModuleId(target);
        const imports = (moduleMeta.imports ?? []).map((ref) => Ref.resolve(ref));
        const providerTargets = (moduleMeta.providers ?? []).map((ref) => Ref.resolve(ref));
        const viewTargets = (moduleMeta.views ?? []).map((ref) => Ref.resolve(ref));
        const windowTargets = (moduleMeta.windows ?? []).map((ref) => Ref.resolve(ref));
        const exportTargets = (moduleMeta.exports ?? []).map((ref) => Ref.resolve(ref));

        for (const imported of imports) {
            if (!getModuleMetadata(imported)) {
                throw BootstrapError.invalidImportedModule(target.name, imported.name);
            }
        }

        const scanDeclaredTarget = (providerTarget: Constructor, kind: ProviderKind): ProviderDefinition => {
            const injectable = getInjectableMetadata(providerTarget);
            const viewMeta = getViewMetadata(providerTarget);
            const windowMeta = getWindowMetadata(providerTarget);

            if (kind === "provider" && !injectable) {
                throw BootstrapError.invalidModuleProvider(target.name, providerTarget.name);
            }
            if (kind === "view" && !viewMeta) {
                throw BootstrapError.invalidModuleView(target.name, providerTarget.name);
            }
            if (kind === "window" && !windowMeta) {
                throw BootstrapError.invalidModuleWindow(target.name, providerTarget.name);
            }

            const view: ViewDefinition | undefined = viewMeta
                ? {
                      id: viewMeta.id,
                      ownerModuleId: moduleId,
                      source: viewMeta.source,
                      access: viewMeta.access ?? [],
                      signals: viewMeta.signals ?? [],
                      target: providerTarget,
                      configuration: viewMeta.configuration,
                  }
                : undefined;

            const window: WindowDefinition | undefined = windowMeta
                ? {
                      id: windowMeta.id,
                      ownerModuleId: moduleId,
                      target: providerTarget,
                      configuration: windowMeta.configuration,
                  }
                : undefined;

            const scanned = scanProviderMethods(moduleId, providerTarget, providerTarget.name);

            const provider: ProviderDefinition = {
                id: providerTarget.name,
                target: providerTarget,
                ownerModuleId: moduleId,
                scope: injectable?.scope ?? "singleton",
                kind,
                view,
                window,
                bridgeMethods: scanned.bridgeMethods,
                signalHandlers: scanned.signalHandlers,
                jobs: scanned.jobs,
            };

            if (view) allViews.push(view);
            if (window) allWindows.push(window);

            return provider;
        };

        const moduleProviders: ProviderDefinition[] = [
            ...providerTargets.map((providerTarget) => scanDeclaredTarget(providerTarget, "provider")),
            ...viewTargets.map((providerTarget) => scanDeclaredTarget(providerTarget, "view")),
            ...windowTargets.map((providerTarget) => scanDeclaredTarget(providerTarget, "window")),
        ];

        allProviders.push(...moduleProviders);

        moduleMap.set(target, {
            id: moduleId,
            target,
            imports,
            providers: moduleProviders,
            exportTargets,
        });

        for (const imported of imports) {
            visit(imported);
        }
    };

    visit(rootModule);

    const modules = [...moduleMap.values()];

    return {
        rootModule,
        modules,
        providers: allProviders,
        views: allViews,
        windows: allWindows,
        bridgeMethods: allProviders.flatMap((p) => p.bridgeMethods),
        signalHandlers: allProviders.flatMap((p) => p.signalHandlers),
        jobs: allProviders.flatMap((p) => p.jobs),
    };
}
