import { ElectroError } from "./electro.error";

export class ProviderError extends ElectroError {}

export class ProviderConfigurationError extends ProviderError {
    public static invalidProvider(received: unknown): ProviderConfigurationError {
        return new ProviderConfigurationError("Provider definition is invalid.", "ELECTRO_PROVIDER_INVALID", {
            received,
        });
    }

    public static missingProvide(received: unknown): ProviderConfigurationError {
        return new ProviderConfigurationError('Provider definition must declare a valid "provide" token.', "ELECTRO_PROVIDER_MISSING_PROVIDE", { received });
    }

    public static invalidStrategyCombination(received: unknown): ProviderConfigurationError {
        return new ProviderConfigurationError(
            'Provider definition must declare exactly one strategy, and the only supported object-provider strategy is "useClass".',
            "ELECTRO_PROVIDER_INVALID_STRATEGY_COMBINATION",
            { received },
        );
    }

    public static invalidUseClass(received: unknown): ProviderConfigurationError {
        return new ProviderConfigurationError(
            'Provider definition field "useClass" must be a class constructor or Ref.create(() => class).',
            "ELECTRO_PROVIDER_INVALID_USE_CLASS",
            { received },
        );
    }
}
