import { ElectroError } from "./electro.error";

export class ModuleError extends ElectroError {}

export class ModuleConfigurationError extends ModuleError {
    public static invalidImports(received: unknown): ModuleConfigurationError {
        return new ModuleConfigurationError(
            '@Module() option "imports" must be an array of decorated module classes or Ref.create(() => module class) values when provided.',
            "ELECTRO_MODULE_INVALID_IMPORTS",
            { received },
        );
    }

    public static invalidProviders(received: unknown): ModuleConfigurationError {
        return new ModuleConfigurationError(
            '@Module() option "providers" must be an array of decorated injectable classes (@Injectable()) or Ref.create(() => injectable class) values when provided.',
            "ELECTRO_MODULE_INVALID_PROVIDERS",
            { received },
        );
    }

    public static invalidViews(received: unknown): ModuleConfigurationError {
        return new ModuleConfigurationError(
            '@Module() option "views" must be an array of decorated view classes (@View()) or Ref.create(() => view class) values when provided.',
            "ELECTRO_MODULE_INVALID_VIEWS",
            { received },
        );
    }

    public static invalidWindows(received: unknown): ModuleConfigurationError {
        return new ModuleConfigurationError(
            '@Module() option "windows" must be an array of decorated window classes (@Window()) or Ref.create(() => window class) values when provided.',
            "ELECTRO_MODULE_INVALID_WINDOWS",
            { received },
        );
    }

    public static invalidExports(received: unknown): ModuleConfigurationError {
        return new ModuleConfigurationError(
            '@Module() option "exports" must be an array of decorated declared classes (@Injectable(), @View(), @Window()) or Ref.create(() => declared class) values when provided.',
            "ELECTRO_MODULE_INVALID_EXPORTS",
            { received },
        );
    }
}
