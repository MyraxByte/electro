import { ProviderConfigurationError } from "../errors";
import type { ClassProvider, Constructor, Provider } from "../types";
import { isConstructable } from "../utils/is-constructable";
import { ResolvableValidator } from "./resolvable.validator";
import { TokenValidator } from "./token.validator";

function isObjectRecord(value: unknown): value is Record<PropertyKey, unknown> {
    return typeof value === "object" && value !== null;
}

function hasOnlyUseClassStrategy(provider: Record<PropertyKey, unknown>): boolean {
    return "useClass" in provider && !("useValue" in provider) && !("useFactory" in provider) && !("useExisting" in provider);
}

export class ProviderDefinitionValidator {
    public static isProviderClass<TValue extends object>(provider: unknown): provider is Constructor<TValue> {
        return isConstructable(provider);
    }

    public static isClassProvider<TValue extends object>(provider: unknown): provider is ClassProvider<TValue> {
        if (!isObjectRecord(provider)) {
            return false;
        }

        if (!("provide" in provider)) {
            return false;
        }

        if (!hasOnlyUseClassStrategy(provider)) {
            return false;
        }

        return TokenValidator.isInjectionToken(provider.provide) && ResolvableValidator.matches(provider.useClass, isConstructable);
    }

    public static isProvider(provider: unknown): provider is Provider {
        return ProviderDefinitionValidator.isProviderClass(provider) || ProviderDefinitionValidator.isClassProvider(provider);
    }

    public static validate(provider: unknown): void {
        if (ProviderDefinitionValidator.isProviderClass(provider)) {
            return;
        }

        if (!isObjectRecord(provider)) {
            throw ProviderConfigurationError.invalidProvider(provider);
        }

        if (!("provide" in provider)) {
            throw ProviderConfigurationError.missingProvide(provider);
        }

        TokenValidator.ensureInjectionToken(provider.provide);

        if (!hasOnlyUseClassStrategy(provider)) {
            throw ProviderConfigurationError.invalidStrategyCombination(provider);
        }

        if (!ResolvableValidator.matches(provider.useClass, isConstructable)) {
            throw ProviderConfigurationError.invalidUseClass(provider);
        }
    }
}
