import { describe, expect, it } from "vitest";
import { createClassDecorator } from "../../../src/decorators/helpers/create-class-decorator";
import { DecoratorConfigurationError, DecoratorTargetError } from "../../../src/errors";
import { getOwnMetadata } from "../../../src/metadata";
import { expectElectroError } from "../../../src/utils/expect-electro-error";

describe("createClassDecorator()", () => {
    const TEST_METADATA_KEY = Symbol("test:class");

    it("creates class decorator with default options", () => {
        const TestDecorator = createClassDecorator<{ readonly value?: string }, { readonly value: string }>({
            decoratorName: "@Test()",
            metadataKey: TEST_METADATA_KEY,
            createDefaultOptions: () => ({}),
            validateOptions: () => {},
            buildMetadata: (_target, options) => ({
                value: options.value ?? "default",
            }),
        });

        @TestDecorator()
        class TestClass {}

        expect(getOwnMetadata(TEST_METADATA_KEY, TestClass)).toEqual({
            value: "default",
        });
    });

    it("creates class decorator with explicit options", () => {
        const TestDecorator = createClassDecorator<{ readonly value: string }, { readonly value: string }>({
            decoratorName: "@Test()",
            metadataKey: TEST_METADATA_KEY,
            validateOptions: () => {},
            buildMetadata: (_target, options) => ({
                value: options.value,
            }),
        });

        @TestDecorator({ value: "custom" })
        class TestClass {}

        expect(getOwnMetadata(TEST_METADATA_KEY, TestClass)).toEqual({
            value: "custom",
        });
    });

    it("passes target into metadata factory", () => {
        const TestDecorator = createClassDecorator<Record<string, never>, { readonly className: string }>({
            decoratorName: "@Test()",
            metadataKey: TEST_METADATA_KEY,
            createDefaultOptions: () => ({}),
            validateOptions: () => {},
            buildMetadata: (target) => ({
                className: target.name,
            }),
        });

        @TestDecorator()
        class MyService {}

        expect(getOwnMetadata(TEST_METADATA_KEY, MyService)).toEqual({
            className: "MyService",
        });
    });

    it("stores frozen metadata", () => {
        const TestDecorator = createClassDecorator<Record<string, never>, { readonly value: string }>({
            decoratorName: "@Test()",
            metadataKey: TEST_METADATA_KEY,
            createDefaultOptions: () => ({}),
            validateOptions: () => {},
            buildMetadata: () => ({
                value: "x",
            }),
        });

        @TestDecorator()
        class TestClass {}

        const metadata = getOwnMetadata<{ readonly value: string }>(TEST_METADATA_KEY, TestClass)!;

        expect(Object.isFrozen(metadata)).toBe(true);
    });

    it("validates options before returning decorator", () => {
        const TestDecorator = createClassDecorator<{ readonly value?: string }, { readonly value: string }>({
            decoratorName: "@Test()",
            metadataKey: TEST_METADATA_KEY,
            createDefaultOptions: () => ({}),
            validateOptions: (options) => {
                if (options.value === undefined) {
                    throw DecoratorConfigurationError.invalidNonEmptyString("@Test()", "value", options.value);
                }
            },
            buildMetadata: (_target, options) => ({
                value: options.value!,
            }),
        });

        const act = () => TestDecorator();

        expect(act).toThrow(/non-empty string/i);

        expectElectroError(act, {
            type: DecoratorConfigurationError,
            code: "ELECTRO_DECORATOR_INVALID_OPTION",
            context: {
                decorator: "@Test()",
                option: "value",
            },
        });
    });

    it("rejects non-class target", () => {
        const TestDecorator = createClassDecorator<Record<string, never>, { readonly value: string }>({
            decoratorName: "@Test()",
            metadataKey: TEST_METADATA_KEY,
            createDefaultOptions: () => ({}),
            validateOptions: () => {},
            buildMetadata: () => ({
                value: "x",
            }),
        });

        const decorator = TestDecorator();
        const act = () => decorator({} as never);

        expect(act).toThrow(/only be applied to classes/i);

        expectElectroError(act, {
            type: DecoratorTargetError,
            code: "ELECTRO_DECORATOR_INVALID_TARGET",
            context: {
                decorator: "@Test()",
            },
        });
    });
});
