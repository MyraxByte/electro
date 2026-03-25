import type { ClassToken, Constructor } from "./constructors";

/**

* Represents a typed injection token object.
*
* Electro intentionally does not use raw strings as tokens in the public API,
* because string tokens weaken type safety and make refactoring less reliable.
 */
export interface InjectionTokenSymbol<TValue = unknown> {
    /**
     * Internal discriminator used by helper utilities and runtime code.
     */
    readonly kind: "injection-token";

    /**
     * Human-readable token description used in diagnostics and tooling.
     */
    readonly description: string;

    /**
     * Unique symbol identity used by the runtime container.
     */
    readonly key: symbol;

    /**
     * Phantom type carrier used exclusively for compile-time inference.
     */
    readonly __type?: TValue | undefined;
}

/**

* Represents any public injection token supported by Electro.
 */
export type InjectionToken<TValue = unknown> = ClassToken<TValue> | InjectionTokenSymbol<TValue>;

/**

* Represents a lazily resolved reference used to break declaration-time cycles.
 */
export interface ForwardReference<TValue> {
    readonly ref: () => TValue;
    readonly [key: symbol]: unknown;
}

/**

* Represents a value that can either be immediate or lazily resolved later.
 */
export type Resolvable<TValue> = TValue | ForwardReference<TValue>;

/**

* Defines the lifecycle semantics for a provider.
*
* The exact runtime behavior is implemented by the runtime package.
 */
export type ProviderScope = "singleton" | "transient";

/**

* Options accepted by `@Injectable()`.
 */
export interface InjectableOptions {
    /**
     * Declares the intended provider scope.
     *
     * Defaults to `"singleton"`.
     */
    readonly scope?: ProviderScope;
}

/**

* Declares a provider backed by a class.
 */
export interface ClassProvider<TValue = unknown> {
    readonly provide: InjectionToken<TValue>;
    readonly useClass: Resolvable<Constructor<TValue>>;
}

/**

* Represents any provider declaration supported by Electro.
 */
export type Provider<TValue = unknown> = Constructor<TValue> | ClassProvider<TValue>;
