/**
 * Abstract base class for all framework errors in `@electro/runtime`.
 *
 * Every concrete error subclass (e.g. {@link BootstrapError}, {@link DIError}) extends this class
 * and exposes static factory methods that produce pre-formatted, coded error instances.
 *
 * @remarks
 * Each error carries a unique {@link RuntimeError.code | code} string (e.g. `"ELECTRO_DI_PROVIDER_NOT_FOUND"`)
 * and an optional {@link RuntimeError.context | context} bag of structured data for programmatic inspection.
 * Application code should catch specific subclasses rather than `RuntimeError` directly.
 */
export abstract class RuntimeError extends Error {
    /** Machine-readable error code, unique per failure scenario (e.g. `"ELECTRO_DI_CIRCULAR_DEPENDENCY"`). */
    public readonly code: string;

    /** Structured context data describing the error. Keys vary by error code. */
    public readonly context?: Readonly<Record<string, unknown>>;

    protected constructor(message: string, code: string, context?: Readonly<Record<string, unknown>>) {
        super(message);
        this.name = new.target.name;
        this.code = code;
        this.context = context;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
