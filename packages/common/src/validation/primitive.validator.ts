import { DecoratorConfigurationError } from "../errors";

export class PrimitiveValidator {
    public static ensureNonEmptyString(value: unknown, decorator: string, option: string): asserts value is string {
        if (typeof value !== "string" || value.trim().length === 0) {
            throw DecoratorConfigurationError.invalidNonEmptyString(decorator, option, value);
        }
    }
}
