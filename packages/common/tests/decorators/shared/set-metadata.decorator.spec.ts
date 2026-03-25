import { describe, expect, it } from "vitest";
import { SetMetadata } from "../../../src/decorators/shared/set-metadata.decorator";
import { DecoratorTargetError } from "../../../src/errors";
import { getOwnMetadata } from "../../../src/metadata";
import { expectElectroError } from "../../../src/utils/expect-electro-error";

describe("SetMetadata()", () => {
    it("defines metadata on class target", () => {
        const KEY = Symbol("meta");

        @SetMetadata(KEY, "class-value")
        class TestClass {}

        expect(getOwnMetadata(KEY, TestClass)).toBe("class-value");
    });

    it("defines metadata on method handler function", () => {
        const KEY = Symbol("meta");

        class TestClass {
            @SetMetadata(KEY, "method-value")
            public run(this: void): void {}
        }

        expect(getOwnMetadata(KEY, TestClass.prototype.run)).toBe("method-value");
        expect(getOwnMetadata(KEY, TestClass.prototype, "run")).toBeUndefined();
    });

    it("defines metadata on property target", () => {
        const KEY = Symbol("meta");

        class TestClass {
            @SetMetadata(KEY, "property-value")
            public value!: string;
        }

        expect(getOwnMetadata(KEY, TestClass.prototype, "value")).toBe("property-value");
    });

    it("rejects parameter decorators", () => {
        const KEY = Symbol("meta");
        const parameterDecorator = SetMetadata(KEY, "parameter-value") as unknown as ParameterDecorator;

        const act = () => {
            class TestClass {
                public run(_value: string): void {}
            }

            parameterDecorator(TestClass.prototype, "run", 0);
        };

        expect(act).toThrow(/does not support parameter decorators/i);

        expectElectroError(act, {
            type: DecoratorTargetError,
            code: "ELECTRO_DECORATOR_PARAMETER_UNSUPPORTED",
            context: {
                decorator: "@SetMetadata()",
            },
        });
    });
});
