import { describe, expect, it } from "vitest";
import { apply } from "../../../src/decorators/shared/apply.decorator";
import { DecoratorConfigurationError } from "../../../src/errors";
import { expectElectroError } from "../../../src/utils/expect-electro-error";

describe("apply()", () => {
    it("applies class decorators in order", () => {
        const calls: string[] = [];

        const first: ClassDecorator = () => {
            calls.push("first");
        };

        const second: ClassDecorator = () => {
            calls.push("second");
        };

        @apply(first, second)
        class TestClass {}

        expect(TestClass).toBeDefined();
        expect(calls).toEqual(["first", "second"]);
    });

    it("applies method decorators in order", () => {
        const calls: string[] = [];

        const first: MethodDecorator = () => {
            calls.push("first");
        };

        const second: MethodDecorator = () => {
            calls.push("second");
        };

        class TestClass {
            @apply(first, second)
            public run(): void {}
        }

        expect(TestClass).toBeDefined();
        expect(calls).toEqual(["first", "second"]);
    });

    it("applies parameter decorators in order", () => {
        const calls: string[] = [];

        const first: ParameterDecorator = () => {
            calls.push("first");
        };

        const second: ParameterDecorator = () => {
            calls.push("second");
        };

        class TestClass {
            public run(
                @apply(first, second)
                _value: string,
            ): void {}
        }

        expect(TestClass).toBeDefined();
        expect(calls).toEqual(["first", "second"]);
    });

    it("rejects invalid decorator list", () => {
        const act = () => apply((() => {}) as ClassDecorator, 123 as never);

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
