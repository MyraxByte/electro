import { DecoratorConfigurationError } from "../errors";
import type { ProviderScope } from "../types";

const ALLOWED_PROVIDER_SCOPES: ReadonlySet<ProviderScope> = new Set(["singleton", "transient"]);

export class ScopeValidator {
    public static ensureProviderScope(value: unknown, decorator: string, option: string): asserts value is ProviderScope {
        if (value === undefined) {
            return;
        }

        if (typeof value !== "string" || !ALLOWED_PROVIDER_SCOPES.has(value as ProviderScope)) {
            throw DecoratorConfigurationError.invalidScope(decorator, option, value);
        }
    }
}
