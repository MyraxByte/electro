import { describe, expect, it } from "vitest";
import { DecoratorConfigurationError } from "../../src/errors";
import { expectElectroError } from "../../src/utils/expect-electro-error";
import { ScopeValidator } from "../../src/validation/scope.validator";

describe("ScopeValidator", () => {
    it("accepts undefined", () => {
        expect(() => ScopeValidator.ensureProviderScope(undefined, "@Injectable()", "scope")).not.toThrow();
    });

    it('accepts "singleton"', () => {
        expect(() => ScopeValidator.ensureProviderScope("singleton", "@Injectable()", "scope")).not.toThrow();
    });

    it('accepts "transient"', () => {
        expect(() => ScopeValidator.ensureProviderScope("transient", "@Injectable()", "scope")).not.toThrow();
    });

    it("rejects unsupported scope", () => {
        const act = () => ScopeValidator.ensureProviderScope("request", "@Injectable()", "scope");

        expect(act).toThrow(/singleton", "transient"/i);

        expectElectroError(act, {
            type: DecoratorConfigurationError,
            code: "ELECTRO_DECORATOR_INVALID_SCOPE",
            context: {
                decorator: "@Injectable()",
                option: "scope",
                received: "request",
            },
        });
    });

    it("rejects non-string scope", () => {
        const act = () => ScopeValidator.ensureProviderScope(123, "@Injectable()", "scope");

        expect(act).toThrow(/singleton", "transient"/i);

        expectElectroError(act, {
            type: DecoratorConfigurationError,
            code: "ELECTRO_DECORATOR_INVALID_SCOPE",
            context: {
                decorator: "@Injectable()",
                option: "scope",
                received: 123,
            },
        });
    });
});
