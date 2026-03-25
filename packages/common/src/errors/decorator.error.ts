import { ElectroError } from "./electro.error";

export class DecoratorError extends ElectroError {}

export class DecoratorTargetError extends DecoratorError {
    public static classOnly(decorator: string, received: unknown): DecoratorTargetError {
        return new DecoratorTargetError(`${decorator} can only be applied to classes.`, "ELECTRO_DECORATOR_INVALID_TARGET", {
            decorator,
            receivedType: typeof received,
        });
    }

    public static staticMethodForbidden(decorator: string, propertyKey: unknown): DecoratorTargetError {
        return new DecoratorTargetError(`${decorator} cannot be applied to static methods.`, "ELECTRO_DECORATOR_STATIC_METHOD_FORBIDDEN", {
            decorator,
            propertyKey,
        });
    }

    public static instanceMethodOnly(decorator: string, propertyKey: unknown): DecoratorTargetError {
        return new DecoratorTargetError(`${decorator} can only be applied to named instance methods.`, "ELECTRO_DECORATOR_INVALID_TARGET", {
            decorator,
            propertyKey,
        });
    }

    public static parameterDecoratorsUnsupported(decorator: string): DecoratorTargetError {
        return new DecoratorTargetError(`${decorator} does not support parameter decorators.`, "ELECTRO_DECORATOR_PARAMETER_UNSUPPORTED", {
            decorator,
        });
    }
}

export class DecoratorConfigurationError extends DecoratorError {
    public static invalidNonEmptyString(decorator: string, option: string, received: unknown): DecoratorConfigurationError {
        return new DecoratorConfigurationError(`${decorator} option "${option}" must be a non-empty string.`, "ELECTRO_DECORATOR_INVALID_OPTION", {
            decorator,
            option,
            received,
        });
    }

    public static invalidStringArray(decorator: string, option: string, received: unknown): DecoratorConfigurationError {
        return new DecoratorConfigurationError(`${decorator} option "${option}" must be an array of non-empty strings.`, "ELECTRO_DECORATOR_INVALID_OPTION", {
            decorator,
            option,
            received,
        });
    }

    public static duplicateStringArrayValue(decorator: string, option: string, duplicateValue: string): DecoratorConfigurationError {
        return new DecoratorConfigurationError(
            `${decorator} option "${option}" must not contain duplicate value "${duplicateValue}".`,
            "ELECTRO_DECORATOR_DUPLICATE_OPTION_VALUE",
            {
                decorator,
                option,
                duplicateValue,
            },
        );
    }

    public static invalidPlainObject(decorator: string, option: string, received: unknown): DecoratorConfigurationError {
        return new DecoratorConfigurationError(`${decorator} option "${option}" must be a plain object when provided.`, "ELECTRO_DECORATOR_INVALID_OPTION", {
            decorator,
            option,
            received,
        });
    }

    public static bundledViewMustNotDeclareId(decorator: string, source: string): DecoratorConfigurationError {
        return new DecoratorConfigurationError(
            `${decorator} must not declare "id" when "source" uses the "view:*" scheme.`,
            "ELECTRO_VIEW_ID_FORBIDDEN_FOR_BUNDLED_RESOURCE",
            {
                decorator,
                source,
            },
        );
    }

    public static externalViewRequiresId(decorator: string, source: string): DecoratorConfigurationError {
        return new DecoratorConfigurationError(
            `${decorator} must declare a non-empty "id" when "source" uses the "file:", "http:" or "https:" scheme.`,
            "ELECTRO_VIEW_ID_REQUIRED_FOR_EXTERNAL_RESOURCE",
            {
                decorator,
                source,
            },
        );
    }

    public static invalidViewSource(decorator: string, source: unknown): DecoratorConfigurationError {
        return new DecoratorConfigurationError(
            `${decorator} option "source" must start with "view:", "file:", "http://" or "https://".`,
            "ELECTRO_VIEW_INVALID_RESOURCE",
            {
                decorator,
                source,
            },
        );
    }

    public static invalidDecoratorList(decorator: string, received: unknown, index?: number): DecoratorConfigurationError {
        return new DecoratorConfigurationError(`${decorator} expects every argument to be a decorator function.`, "ELECTRO_INVALID_DECORATOR_LIST", {
            decorator,
            received,
            index,
        });
    }

    public static invalidScope(decorator: string, option: string, received: unknown): DecoratorConfigurationError {
        return new DecoratorConfigurationError(`${decorator} option "${option}" must be one of: "singleton", "transient".`, "ELECTRO_DECORATOR_INVALID_SCOPE", {
            decorator,
            option,
            received,
        });
    }
}
