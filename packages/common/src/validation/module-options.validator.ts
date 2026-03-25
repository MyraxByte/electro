import { ModuleConfigurationError } from "../errors";
import { getInjectableMetadata, getModuleMetadata, getViewMetadata, getWindowMetadata } from "../metadata";
import type { Constructor, ModuleOptions } from "../types";
import { isConstructable } from "../utils/is-constructable";
import { PrimitiveValidator } from "./primitive.validator";
import { ResolvableValidator } from "./resolvable.validator";

function isDecoratedModuleClass(value: unknown): value is Constructor<object> {
    return isConstructable(value) && getModuleMetadata(value) !== undefined;
}

function isDecoratedInjectableClass(value: unknown): value is Constructor<object> {
    return isConstructable(value) && getInjectableMetadata(value) !== undefined;
}

function isDecoratedViewClass(value: unknown): value is Constructor<object> {
    return isConstructable(value) && getViewMetadata(value) !== undefined;
}

function isDecoratedWindowClass(value: unknown): value is Constructor<object> {
    return isConstructable(value) && getWindowMetadata(value) !== undefined;
}

function isDecoratedDeclarationClass(value: unknown): value is Constructor<object> {
    return isDecoratedInjectableClass(value) || isDecoratedViewClass(value) || isDecoratedWindowClass(value);
}

function validateResolvableArray<TValue>(values: unknown, predicate: (value: unknown) => value is TValue, createError: (received: unknown) => Error): void {
    if (!Array.isArray(values)) {
        throw createError(values);
    }

    for (const entry of values) {
        if (!ResolvableValidator.matches(entry, predicate)) {
            throw createError(values);
        }
    }
}

export class ModuleOptionsValidator {
    public static validate(options: ModuleOptions, decorator: string): void {
        if (options.id !== undefined) {
            PrimitiveValidator.ensureNonEmptyString(options.id, decorator, "id");
        }

        if (options.imports !== undefined) {
            validateResolvableArray(options.imports, isDecoratedModuleClass, (received) => ModuleConfigurationError.invalidImports(received));
        }

        if (options.providers !== undefined) {
            validateResolvableArray(options.providers, isDecoratedInjectableClass, (received) => ModuleConfigurationError.invalidProviders(received));
        }

        if (options.views !== undefined) {
            validateResolvableArray(options.views, isDecoratedViewClass, (received) => ModuleConfigurationError.invalidViews(received));
        }

        if (options.windows !== undefined) {
            validateResolvableArray(options.windows, isDecoratedWindowClass, (received) => ModuleConfigurationError.invalidWindows(received));
        }

        if (options.exports !== undefined) {
            validateResolvableArray(options.exports, isDecoratedDeclarationClass, (received) => ModuleConfigurationError.invalidExports(received));
        }
    }
}
