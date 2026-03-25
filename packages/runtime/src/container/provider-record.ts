import type { ClassToken, Constructor, InjectionToken, ProviderScope } from "@electro/common";

/**
 * Internal record for a class-based provider registered in an {@link Injector}.
 *
 * @internal
 */
export interface ClassProviderRecord {
    readonly kind: "class";
    /** The token consumers use to request this provider. */
    readonly provide: InjectionToken;
    /** The concrete class that will be instantiated. */
    readonly useClass: Constructor;
    /** `"singleton"` (one instance per injector) or `"transient"` (new instance per resolution). */
    readonly scope: ProviderScope;
}

/**
 * Internal record for a value provider registered in an {@link Injector}.
 *
 * @internal
 */
export interface ValueProviderRecord<T = unknown> {
    readonly kind: "value";
    /** The token consumers use to request this provider. */
    readonly provide: InjectionToken<T>;
    /** The pre-existing value returned on resolution. */
    readonly useValue: T;
}

/** @internal Discriminated union of all provider record types. */
export type ProviderRecord = ClassProviderRecord | ValueProviderRecord;

/** @internal The map key used to look up providers -- either a class constructor or a symbol. */
export type ProviderKey = ClassToken<unknown> | symbol;

/**
 * Tracks the instantiation state of a singleton provider within an injector.
 *
 * While `status` is `"resolving"`, the provider is in the middle of being constructed --
 * a second resolution attempt at this point indicates a circular dependency.
 *
 * @internal
 */
export interface ProviderInstanceCell {
    status: "resolving" | "resolved";
    value?: object;
}
