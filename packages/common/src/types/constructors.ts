/**
 * Represents a concrete constructable class.
 */
export type Constructor<TInstance = object, TArgs extends readonly unknown[] = readonly unknown[]> = new (...args: TArgs) => TInstance;

/**
 * Represents an abstract class that can participate in typing and tokens.
 */
export type AbstractConstructor<TInstance = object, TArgs extends readonly unknown[] = readonly unknown[]> = abstract new (...args: TArgs) => TInstance;

/**
 * Represents a class token used for DI and metadata lookup.
 *
 * Constructor parameter types are intentionally erased here because token
 * identity must not depend on the runtime constructor signature.
 *
 * `any[]` is required instead of `unknown[]` to keep classes with concrete
 * constructor parameters assignable to the token type.
 */
export type ClassToken<TInstance = object> = (new (...args: readonly any[]) => TInstance) | (abstract new (...args: readonly any[]) => TInstance);

/**
 * Represents any class-like token accepted by the Electro type system.
 */
export type TargetType<TInstance = object> = ClassToken<TInstance>;
