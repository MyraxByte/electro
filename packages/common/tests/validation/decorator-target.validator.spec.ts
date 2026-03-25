import { describe, expect, it } from "vitest";
import { DecoratorTargetError } from "../../src/errors";
import { expectElectroError } from "../../src/utils/expect-electro-error";
import { DecoratorTargetValidator } from "../../src/validation/decorator-target.validator";

describe("DecoratorTargetValidator", () => {
    it("accepts class target", () => {
        expect(() => DecoratorTargetValidator.ensureClass(class Test {}, "@Injectable()")).not.toThrow();
    });

    it("rejects non-class target", () => {
        const act = () => DecoratorTargetValidator.ensureClass({}, "@Injectable()");

        expect(act).toThrow(/only be applied to classes/i);

        expectElectroError(act, {
            type: DecoratorTargetError,
            code: "ELECTRO_DECORATOR_INVALID_TARGET",
            context: {
                decorator: "@Injectable()",
            },
        });
    });

    it("accepts valid instance method target", () => {
        class Service {
            public run(): void {}
        }

        const descriptor = Object.getOwnPropertyDescriptor(Service.prototype, "run");

        expect(() => DecoratorTargetValidator.ensureInstanceMethod(Service.prototype, "run", descriptor, "@command()")).not.toThrow();
    });

    it("rejects static method target", () => {
        class Service {
            public static run(): void {}
        }

        const descriptor = Object.getOwnPropertyDescriptor(Service, "run");

        const act = () => DecoratorTargetValidator.ensureInstanceMethod(Service, "run", descriptor, "@command()");

        expect(act).toThrow(/static methods/i);

        expectElectroError(act, {
            type: DecoratorTargetError,
            code: "ELECTRO_DECORATOR_STATIC_METHOD_FORBIDDEN",
            context: {
                decorator: "@command()",
                propertyKey: "run",
            },
        });
    });

    it("rejects symbol-named method target", () => {
        class Service {
            public run(): void {}
        }

        const descriptor = Object.getOwnPropertyDescriptor(Service.prototype, "run");
        const key = Symbol("run");

        const act = () => DecoratorTargetValidator.ensureInstanceMethod(Service.prototype, key, descriptor, "@command()");

        expect(act).toThrow(/named instance methods/i);

        expectElectroError(act, {
            type: DecoratorTargetError,
            code: "ELECTRO_DECORATOR_INVALID_TARGET",
            context: {
                decorator: "@command()",
            },
        });
    });

    it("rejects non-function descriptor target", () => {
        const act = () =>
            DecoratorTargetValidator.ensureInstanceMethod(
                {},
                "value",
                {
                    configurable: true,
                    enumerable: true,
                    get: () => "x",
                },
                "@command()",
            );

        expect(act).toThrow(/named instance methods/i);

        expectElectroError(act, {
            type: DecoratorTargetError,
            code: "ELECTRO_DECORATOR_INVALID_TARGET",
            context: {
                decorator: "@command()",
            },
        });
    });
});
