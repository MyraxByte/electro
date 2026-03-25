import { RuntimeError } from "./runtime";

/**
 * Errors thrown during application bootstrap — the phase where modules, providers,
 * views, windows, and bridge channels are validated and assembled into the runtime graph.
 *
 * All instances are created through static factory methods; direct construction is not allowed.
 *
 * @remarks
 * Bootstrap errors indicate misconfiguration that must be fixed before the app can start.
 * They are always thrown synchronously during {@link Kernel.start} (or equivalent bootstrap entry point).
 */
export class BootstrapError extends RuntimeError {
    private constructor(message: string, code: string, context?: Readonly<Record<string, unknown>>) {
        super(message, code, context);
    }

    /** The class passed as root module is missing the `@Module()` decorator. */
    public static rootModuleNotDecorated(className: string): BootstrapError {
        return new BootstrapError(`Class "${className}" is not decorated with @Module().`, "ELECTRO_BOOTSTRAP_ROOT_NOT_MODULE", { className });
    }

    /** A module's `imports` array contains a class that is not decorated with `@Module()`. */
    public static invalidImportedModule(parentModule: string, importedName: string): BootstrapError {
        return new BootstrapError(
            `Module "${parentModule}" imports "${importedName}" which is not decorated with @Module().`,
            "ELECTRO_BOOTSTRAP_INVALID_IMPORT",
            { parentModule, importedName },
        );
    }

    /** A module's `providers` array contains a class that is not decorated with `@Injectable()`. */
    public static invalidModuleProvider(moduleName: string, providerName: string): BootstrapError {
        return new BootstrapError(
            `Module "${moduleName}" declares provider "${providerName}" which is not decorated with @Injectable().`,
            "ELECTRO_BOOTSTRAP_INVALID_PROVIDER",
            { moduleName, providerName },
        );
    }

    /** A module's `views` array contains a class that is not decorated with `@View()`. */
    public static invalidModuleView(moduleName: string, viewName: string): BootstrapError {
        return new BootstrapError(`Module "${moduleName}" declares view "${viewName}" which is not decorated with @View().`, "ELECTRO_BOOTSTRAP_INVALID_VIEW", {
            moduleName,
            viewName,
        });
    }

    /** A module's `windows` array contains a class that is not decorated with `@Window()`. */
    public static invalidModuleWindow(moduleName: string, windowName: string): BootstrapError {
        return new BootstrapError(
            `Module "${moduleName}" declares window "${windowName}" which is not decorated with @Window().`,
            "ELECTRO_BOOTSTRAP_INVALID_WINDOW",
            { moduleName, windowName },
        );
    }

    /**
     * Two or more modules import each other, forming a cycle.
     *
     * @remarks
     * The `cycle` context field contains the full import chain (e.g. `["A", "B", "C", "A"]`).
     */
    public static circularModuleImport(cycle: readonly string[]): BootstrapError {
        return new BootstrapError(`Circular module import detected: ${cycle.join(" → ")}.`, "ELECTRO_BOOTSTRAP_CIRCULAR_IMPORT", { cycle });
    }

    /** Two modules resolved to the same module id. Module ids must be unique across the application. */
    public static duplicateModuleId(moduleId: string): BootstrapError {
        return new BootstrapError(`Duplicate module id "${moduleId}". Module ids must be unique.`, "ELECTRO_BOOTSTRAP_DUPLICATE_MODULE_ID", { moduleId });
    }

    /** A module exports a token that is not present in its own `providers` array. */
    public static invalidExport(moduleName: string, exportName: string): BootstrapError {
        return new BootstrapError(
            `Module "${moduleName}" exports "${exportName}" which is not declared in its providers.`,
            "ELECTRO_BOOTSTRAP_INVALID_EXPORT",
            { moduleName, exportName },
        );
    }

    /** Two views resolved to the same view id. View ids must be unique across the application. */
    public static duplicateViewId(viewId: string): BootstrapError {
        return new BootstrapError(`Duplicate view id "${viewId}". View ids must be unique.`, "ELECTRO_BOOTSTRAP_DUPLICATE_VIEW_ID", { viewId });
    }

    /** Two windows resolved to the same window id. Window ids must be unique across the application. */
    public static duplicateWindowId(windowId: string): BootstrapError {
        return new BootstrapError(`Duplicate window id "${windowId}". Window ids must be unique.`, "ELECTRO_BOOTSTRAP_DUPLICATE_WINDOW_ID", { windowId });
    }

    /** Two bridge handlers registered the same channel name. Bridge channels must be unique. */
    public static duplicateBridgeChannel(channel: string): BootstrapError {
        return new BootstrapError(`Duplicate bridge channel "${channel}". Bridge channels must be unique.`, "ELECTRO_BOOTSTRAP_DUPLICATE_BRIDGE_CHANNEL", {
            channel,
        });
    }

    /** Two job handlers registered the same job id. Job ids must be unique across the application. */
    public static duplicateJobId(jobId: string): BootstrapError {
        return new BootstrapError(`Duplicate job id "${jobId}". Job ids must be unique.`, "ELECTRO_BOOTSTRAP_DUPLICATE_JOB_ID", { jobId });
    }

    /** A provider is decorated with both `@View()` and `@Window()`. A provider can only have one role. */
    public static invalidProviderRoleCombination(providerName: string): BootstrapError {
        return new BootstrapError(
            `Provider "${providerName}" has both @View() and @Window() — a provider can only have one role.`,
            "ELECTRO_BOOTSTRAP_INVALID_ROLE_COMBINATION",
            { providerName },
        );
    }

    /** A view's `access` list references a bridge channel that was not registered by any provider. */
    public static invalidViewAccessReference(viewId: string, channel: string): BootstrapError {
        return new BootstrapError(
            `View "${viewId}" references bridge channel "${channel}" in access, but no such channel exists.`,
            "ELECTRO_BOOTSTRAP_INVALID_VIEW_ACCESS",
            { viewId, channel },
        );
    }

    /** A view's `signals` list references a signal id that has no corresponding `@signal()` handler. */
    public static invalidViewSignalReference(viewId: string, signalId: string): BootstrapError {
        return new BootstrapError(
            `View "${viewId}" references signal "${signalId}" in signals, but no such signal handler exists.`,
            "ELECTRO_BOOTSTRAP_INVALID_VIEW_SIGNAL",
            { viewId, signalId },
        );
    }

    /** A module imports another module that has not been loaded into the runtime graph yet. */
    public static importedModuleNotLoaded(parentModule: string, importedModule: string): BootstrapError {
        return new BootstrapError(
            `Module "${parentModule}" imports "${importedModule}" which has not been loaded yet.`,
            "ELECTRO_BOOTSTRAP_IMPORT_NOT_LOADED",
            { parentModule, importedModule },
        );
    }

    /** A capability decorator (e.g. `@command`, `@query`) points to a property that is not a function. */
    public static invalidCapabilityMethod(providerName: string, capability: string, methodName: string): BootstrapError {
        return new BootstrapError(
            `Provider "${providerName}" declares ${capability} method "${methodName}" which is not a function.`,
            "ELECTRO_BOOTSTRAP_INVALID_CAPABILITY_METHOD",
            { providerName, capability, methodName },
        );
    }
}
