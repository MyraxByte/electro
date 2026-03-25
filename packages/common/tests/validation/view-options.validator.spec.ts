import { describe, expect, it } from "vitest";
import { DecoratorConfigurationError } from "../../src/errors";
import { expectElectroError } from "../../src/utils/expect-electro-error";
import { ViewOptionsValidator } from "../../src/validation/view-options.validator";

describe("ViewOptionsValidator", () => {
    it("validates bundled view options", () => {
        const result = ViewOptionsValidator.validate(
            {
                source: "view:main",
                access: [" auth:getMe "],
                signals: [" auth:user-logged-in "],
            },
            "@View()",
        );

        expect(result).toEqual({
            id: "main",
            source: "view:main",
            access: ["auth:getMe"],
            signals: ["auth:user-logged-in"],
            configuration: undefined,
        });
    });

    it("rejects bundled id", () => {
        const act = () =>
            ViewOptionsValidator.validate(
                {
                    id: "main",
                    source: "view:main",
                } as never,
                "@View()",
            );

        expect(act).toThrow(/must not declare "id"/i);

        expectElectroError(act, {
            type: DecoratorConfigurationError,
            code: "ELECTRO_VIEW_ID_FORBIDDEN_FOR_BUNDLED_RESOURCE",
            context: {
                decorator: "@View()",
                source: "view:main",
            },
        });
    });

    it("rejects missing external id", () => {
        const act = () =>
            ViewOptionsValidator.validate(
                {
                    source: "file:./index.html",
                } as never,
                "@View()",
            );

        expect(act).toThrow(/must declare a non-empty "id"/i);

        expectElectroError(act, {
            type: DecoratorConfigurationError,
            code: "ELECTRO_VIEW_ID_REQUIRED_FOR_EXTERNAL_RESOURCE",
            context: {
                decorator: "@View()",
                source: "file:./index.html",
            },
        });
    });
});
