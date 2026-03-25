import { describe, expect, it } from "vitest";
import { DecoratorConfigurationError } from "../../src/errors";
import { expectElectroError } from "../../src/utils/expect-electro-error";
import { PrimitiveValidator } from "../../src/validation/primitive.validator";

describe("PrimitiveValidator", () => {
    it("accepts non-empty string", () => {
        expect(() => PrimitiveValidator.ensureNonEmptyString("abc", "@X()", "id")).not.toThrow();
    });

    it("rejects empty string", () => {
        const act = () => PrimitiveValidator.ensureNonEmptyString("   ", "@X()", "id");

        expect(act).toThrow(/non-empty string/i);

        expectElectroError(act, {
            type: DecoratorConfigurationError,
            code: "ELECTRO_DECORATOR_INVALID_OPTION",
            context: {
                decorator: "@X()",
                option: "id",
                received: "   ",
            },
        });
    });

    it("rejects non-string value", () => {
        const act = () => PrimitiveValidator.ensureNonEmptyString(123, "@X()", "id");

        expect(act).toThrow(/non-empty string/i);

        expectElectroError(act, {
            type: DecoratorConfigurationError,
            code: "ELECTRO_DECORATOR_INVALID_OPTION",
            context: {
                decorator: "@X()",
                option: "id",
                received: 123,
            },
        });
    });
});
