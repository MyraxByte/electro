import { DecoratorConfigurationError } from "../errors";

export class ObjectValidator {
    public static ensurePlainObject(value: unknown, decorator: string, option: string): asserts value is Record<string, unknown> {
        if (value === undefined) {
            return;
        }

        if (typeof value !== "object" || value === null || Array.isArray(value)) {
            throw DecoratorConfigurationError.invalidPlainObject(decorator, option, value);
        }

        const prototype = Object.getPrototypeOf(value);

        if (prototype !== Object.prototype && prototype !== null) {
            throw DecoratorConfigurationError.invalidPlainObject(decorator, option, value);
        }
    }
}
