import { TokenConfigurationError } from "../errors";
import type { Constructor, InjectionToken, InjectionTokenSymbol, Resolvable } from "../types";
import { isConstructable } from "../utils/is-constructable";
import { ResolvableValidator } from "./resolvable.validator";

function isObjectRecord(value: unknown): value is Record<PropertyKey, unknown> {
    return typeof value === "object" && value !== null;
}

export class TokenValidator {
    public static isInjectionTokenSymbol<TValue = unknown>(value: unknown): value is InjectionTokenSymbol<TValue> {
        if (!isObjectRecord(value)) {
            return false;
        }

        return (
            value.kind === "injection-token" && typeof value.description === "string" && value.description.trim().length > 0 && typeof value.key === "symbol"
        );
    }

    public static isInjectionToken<TValue = unknown>(value: unknown): value is InjectionToken<TValue> {
        return isConstructable(value) || TokenValidator.isInjectionTokenSymbol(value);
    }

    public static ensureInjectionToken<TValue = unknown>(value: unknown): asserts value is InjectionToken<TValue> {
        if (!TokenValidator.isInjectionToken(value)) {
            throw TokenConfigurationError.invalidInjectionToken(value);
        }
    }

    public static isResolvableInjectionToken<TValue = unknown>(value: unknown): value is Resolvable<InjectionToken<TValue>> {
        return ResolvableValidator.matches(value, (candidate): candidate is InjectionToken<TValue> => TokenValidator.isInjectionToken(candidate));
    }

    public static ensureResolvableInjectionToken<TValue = unknown>(value: unknown): asserts value is Resolvable<InjectionToken<TValue>> {
        if (!TokenValidator.isResolvableInjectionToken(value)) {
            throw TokenConfigurationError.invalidInjectionToken(value);
        }
    }

    public static isResolvableConstructor<TValue = unknown>(value: unknown): value is Resolvable<Constructor<TValue>> {
        return ResolvableValidator.matches(value, isConstructable);
    }

    public static ensureResolvableConstructor<TValue = unknown>(value: unknown): asserts value is Resolvable<Constructor<TValue>> {
        if (!TokenValidator.isResolvableConstructor(value)) {
            throw TokenConfigurationError.invalidInjectionToken(value);
        }
    }
}
