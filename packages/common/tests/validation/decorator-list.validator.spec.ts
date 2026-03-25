import { describe, expect, it } from "vitest";
import { DecoratorConfigurationError } from "../../src/errors";
import { expectElectroError } from "../../src/utils/expect-electro-error";
import { DecoratorListValidator } from "../../src/validation/decorator-list.validator";

describe("DecoratorListValidator", () => {
    it("accepts valid decorator list", () => {
        expect(() => DecoratorListValidator.validate([(() => {}) as ClassDecorator], "apply()")).not.toThrow();
    });

    it("rejects invalid decorator list", () => {
        const act = () => DecoratorListValidator.validate([123], "apply()");

        expect(act).toThrow(/decorator function/i);

        expectElectroError(act, {
            type: DecoratorConfigurationError,
            code: "ELECTRO_INVALID_DECORATOR_LIST",
            context: {
                decorator: "apply()",
            },
        });
    });
});
