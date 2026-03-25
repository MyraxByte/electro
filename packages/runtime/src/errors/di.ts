import { RuntimeError } from "./runtime";

/**
 * Errors thrown by the dependency injection container during provider resolution and registration.
 *
 * All instances are created through static factory methods; direct construction is not allowed.
 */
export class DIError extends RuntimeError {
    private constructor(message: string, code: string, context?: Readonly<Record<string, unknown>>) {
        super(message, code, context);
    }

    /** The requested injection token has no matching provider in this injector or any ancestor. */
    public static providerNotFound(token: string): DIError {
        return new DIError(`No provider found for "${token}".`, "ELECTRO_DI_PROVIDER_NOT_FOUND", { token });
    }

    /** A provider with the same token is already registered in this injector. */
    public static duplicateProvider(token: string): DIError {
        return new DIError(`Provider "${token}" is already registered in this injector.`, "ELECTRO_DI_DUPLICATE_PROVIDER", { token });
    }

    /**
     * Two or more providers depend on each other, forming a cycle that cannot be resolved.
     *
     * @remarks
     * The `path` context field contains the full resolution chain (e.g. `["A", "B", "C", "A"]`).
     */
    public static circularDependency(path: readonly string[]): DIError {
        return new DIError(`Circular dependency detected: ${path.join(" → ")}.`, "ELECTRO_DI_CIRCULAR_DEPENDENCY", {
            path,
        });
    }

    /** A class was passed as a provider but is missing a framework decorator (`@Injectable()`, `@Module()`, `@View()`, or `@Window()`). */
    public static invalidClassProvider(token: string): DIError {
        return new DIError(
            `"${token}" is not a framework-managed class. Ensure it is decorated with @Injectable(), @Module(), @View(), or @Window().`,
            "ELECTRO_DI_INVALID_CLASS_PROVIDER",
            { token },
        );
    }

    /**
     * {@link inject} was called outside of a framework-managed execution context.
     *
     * @remarks
     * `inject()` is only available during construction (property initializers),
     * lifecycle hooks (`onInit`/`onReady`/`onShutdown`/`onDispose`),
     * and capability handlers (`@command`, `@query`, `@signal`, `@job`).
     */
    public static noInjectionContext(): DIError {
        return new DIError(
            "inject() called outside of a framework-managed context. " +
                "inject() is only available during construction (property initializers), lifecycle hooks (onInit/onReady/onShutdown/onDispose), " +
                "and capability handlers (bridge, signal, job).",
            "ELECTRO_DI_NO_INJECTION_CONTEXT",
        );
    }
}
