import { describe, expect, it } from "vitest";
import { DecoratorConfigurationError } from "../../src/errors";
import { expectElectroError } from "../../src/utils/expect-electro-error";
import { ObjectValidator } from "../../src/validation/object.validator";

describe("ObjectValidator", () => {
    it("accepts undefined", () => {
        expect(() => ObjectValidator.ensurePlainObject(undefined, "@View()", "webPreferences")).not.toThrow();
    });

    it("accepts plain object", () => {
        expect(() => ObjectValidator.ensurePlainObject({}, "@View()", "webPreferences")).not.toThrow();
    });

    it("accepts object with null prototype", () => {
        expect(() => ObjectValidator.ensurePlainObject(Object.create(null), "@View()", "webPreferences")).not.toThrow();
    });

    it("rejects array", () => {
        const act = () => ObjectValidator.ensurePlainObject([], "@View()", "webPreferences");

        expect(act).toThrow(/plain object/i);

        expectElectroError(act, {
            type: DecoratorConfigurationError,
            code: "ELECTRO_DECORATOR_INVALID_OPTION",
            context: {
                decorator: "@View()",
                option: "webPreferences",
            },
        });
    });

    it("rejects class instance", () => {
        const act = () => ObjectValidator.ensurePlainObject(new Map(), "@View()", "webPreferences");

        expect(act).toThrow(/plain object/i);

        expectElectroError(act, {
            type: DecoratorConfigurationError,
            code: "ELECTRO_DECORATOR_INVALID_OPTION",
            context: {
                decorator: "@View()",
                option: "webPreferences",
            },
        });
    });
});
