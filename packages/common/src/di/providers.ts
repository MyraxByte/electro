import { getModuleMetadata } from "../metadata/accessors";
import type { ClassProvider, Constructor, Provider } from "../types";
import { isConstructable } from "../utils/is-constructable";
import { ProviderDefinitionValidator } from "../validation";

/**
 * Checks whether a value is a concrete constructor function.
 */
export function isConstructor<TValue extends object>(value: unknown): value is Constructor<TValue> {
    return isConstructable(value);
}

/**
 * Checks whether a provider entry is a plain class provider shorthand.
 *
 * Example:
 * `providers: [AuthService]`
 */
export function isProviderClass<TValue extends object>(provider: unknown): provider is Constructor<TValue> {
    return ProviderDefinitionValidator.isProviderClass(provider);
}

/**
 * Checks whether a provider is declared via `useClass`.
 */
export function isClassProvider<TValue extends object>(provider: unknown): provider is ClassProvider<TValue> {
    return ProviderDefinitionValidator.isClassProvider(provider);
}

/**
 * Checks whether a value is any supported provider declaration.
 */
export function isProvider(provider: unknown): provider is Provider {
    return ProviderDefinitionValidator.isProvider(provider);
}

/**
 * Checks whether a value is a decorated ElectroJS module class.
 */
export function isModule(value: unknown): value is Constructor<object> {
    return isConstructable(value) && getModuleMetadata(value as Constructor<object>) !== undefined;
}
