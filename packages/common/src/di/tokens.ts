import { TokenConfigurationError } from "../errors";
import type { InjectionToken, InjectionTokenSymbol } from "../types";
import { TokenValidator } from "../validation";

/**
 * Creates a strongly typed injection token.
 *
 * This is the recommended way to represent non-class dependencies in Electro,
 * because it preserves compile-time typing without falling back to raw strings.
 */
export function createInjectionToken<TValue>(description: string): InjectionTokenSymbol<TValue> {
    if (typeof description !== "string" || description.trim().length === 0) {
        throw TokenConfigurationError.invalidInjectionTokenDescription(description);
    }

    const normalizedDescription = description.trim();

    return Object.freeze({
        kind: "injection-token" as const,
        description: normalizedDescription,
        key: Symbol(normalizedDescription),
    }) as InjectionTokenSymbol<TValue>;
}

/**
 * Checks whether a value is a typed Electro injection token object.
 */
export function isInjectionTokenSymbol<TValue = unknown>(value: unknown): value is InjectionTokenSymbol<TValue> {
    return TokenValidator.isInjectionTokenSymbol(value);
}

/**
 * Returns a human-readable token description suitable for errors and diagnostics.
 */
export function describeInjectionToken(token: InjectionToken): string {
    if (typeof token === "function") {
        return token.name || "<anonymous class>";
    }

    if (isInjectionTokenSymbol(token)) {
        return token.description;
    }

    return "<unknown token>";
}
