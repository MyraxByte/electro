import { describe, expect, it } from "vitest";
import { DecoratorConfigurationError } from "../../src/errors";
import { expectElectroError } from "../../src/utils/expect-electro-error";
import { WindowOptionsValidator } from "../../src/validation/window-options.validator";

describe("WindowOptionsValidator", () => {
    it("accepts empty options", () => {
        expect(() => WindowOptionsValidator.validate({}, "@Window()")).not.toThrow();
    });

    it("accepts valid id", () => {
        const result = WindowOptionsValidator.validate({ id: "main" }, "@Window()");

        expect(result).toEqual({
            id: "main",
            configuration: undefined,
        });
    });

    it("rejects empty id", () => {
        const act = () => WindowOptionsValidator.validate({ id: "   " }, "@Window()");

        expect(act).toThrow(/must be a non-empty string/i);

        expectElectroError(act, {
            type: DecoratorConfigurationError,
            code: "ELECTRO_DECORATOR_INVALID_OPTION",
            context: {
                decorator: "@Window()",
                option: "id",
            },
        });
    });

    it("accepts plain configuration object", () => {
        expect(() =>
            WindowOptionsValidator.validate(
                {
                    configuration: {
                        show: true,
                    },
                },
                "@Window()",
            ),
        ).not.toThrow();
    });

    it("rejects non-plain configuration object", () => {
        const act = () =>
            WindowOptionsValidator.validate(
                {
                    configuration: new Map() as never,
                },
                "@Window()",
            );

        expect(act).toThrow(/plain object/i);

        expectElectroError(act, {
            type: DecoratorConfigurationError,
            code: "ELECTRO_DECORATOR_INVALID_OPTION",
            context: {
                decorator: "@Window()",
                option: "configuration",
            },
        });
    });
});
