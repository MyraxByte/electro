import { ElectroError } from "./electro.error";

export class TokenError extends ElectroError {}

export class TokenConfigurationError extends TokenError {
    public static invalidInjectionToken(received: unknown): TokenConfigurationError {
        return new TokenConfigurationError("Injection token is invalid.", "ELECTRO_TOKEN_INVALID", { received });
    }

    public static invalidInjectionTokenDescription(received: unknown): TokenConfigurationError {
        return new TokenConfigurationError("createInjectionToken() requires a non-empty description string.", "ELECTRO_TOKEN_INVALID_DESCRIPTION", {
            received,
        });
    }

    public static invalidForwardRefFactory(received: unknown): TokenConfigurationError {
        return new TokenConfigurationError("Ref.create() expects a function.", "ELECTRO_FORWARD_REF_INVALID_FACTORY", {
            received,
        });
    }
}
