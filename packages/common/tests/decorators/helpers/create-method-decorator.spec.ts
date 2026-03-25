import { describe, expect, it } from "vitest";
import { createMethodDecorator } from "../../../src/decorators/helpers/create-method-decorator";
import { DecoratorConfigurationError, DecoratorTargetError, MetadataConflictError } from "../../../src/errors";
import { COMMAND_METADATA, getOwnMetadata } from "../../../src/metadata";
import { expectElectroError } from "../../../src/utils/expect-electro-error";

describe("createMethodDecorator()", () => {
    it("creates method decorator with default options", () => {
        const testDecorator = createMethodDecorator<{ readonly kind: "command"; readonly methodName: string; readonly id: string }, { readonly id?: string }>({
            decoratorName: "@test()",
            metadataKey: COMMAND_METADATA,
            createDefaultOptions: () => ({}),
            validateOptions: () => {},
            buildMetadata: (methodName, options) => ({
                kind: "command",
                methodName,
                id: options.id ?? methodName,
            }),
        });

        class Service {
            @testDecorator()
            public run(this: void): void {}
        }

        expect(getOwnMetadata(COMMAND_METADATA, Service.prototype.run)).toEqual({
            kind: "command",
            methodName: "run",
            id: "run",
        });
    });

    it("creates method decorator with explicit options", () => {
        const testDecorator = createMethodDecorator<{ readonly kind: "command"; readonly methodName: string; readonly id: string }, { readonly id: string }>({
            decoratorName: "@test()",
            metadataKey: COMMAND_METADATA,
            validateOptions: () => {},
            buildMetadata: (methodName, options) => ({
                kind: "command",
                methodName,
                id: options.id,
            }),
        });

        class Service {
            @testDecorator({ id: "custom:run" })
            public run(this: void): void {}
        }

        expect(getOwnMetadata(COMMAND_METADATA, Service.prototype.run)).toEqual({
            kind: "command",
            methodName: "run",
            id: "custom:run",
        });
    });

    it("stores frozen metadata", () => {
        const testDecorator = createMethodDecorator<{ readonly kind: "command"; readonly methodName: string; readonly id: string }, Record<string, never>>({
            decoratorName: "@test()",
            metadataKey: COMMAND_METADATA,
            createDefaultOptions: () => ({}),
            validateOptions: () => {},
            buildMetadata: (methodName) => ({
                kind: "command",
                methodName,
                id: methodName,
            }),
        });

        class Service {
            @testDecorator()
            public run(this: void): void {}
        }

        const metadata = getOwnMetadata<{ readonly id: string }>(COMMAND_METADATA, Service.prototype.run)!;

        expect(Object.isFrozen(metadata)).toBe(true);
    });

    it("validates options before returning decorator", () => {
        const testDecorator = createMethodDecorator<{ readonly kind: "command"; readonly methodName: string; readonly id: string }, { readonly id?: string }>({
            decoratorName: "@test()",
            metadataKey: COMMAND_METADATA,
            createDefaultOptions: () => ({}),
            validateOptions: (options) => {
                if (options.id === undefined) {
                    throw DecoratorConfigurationError.invalidNonEmptyString("@test()", "id", options.id);
                }
            },
            buildMetadata: (methodName, options) => ({
                kind: "command",
                methodName,
                id: options.id!,
            }),
        });

        const act = () => testDecorator();

        expect(act).toThrow(/non-empty string/i);

        expectElectroError(act, {
            type: DecoratorConfigurationError,
            code: "ELECTRO_DECORATOR_INVALID_OPTION",
            context: {
                decorator: "@test()",
                option: "id",
            },
        });
    });

    it("rejects static methods", () => {
        const testDecorator = createMethodDecorator<{ readonly kind: "command"; readonly methodName: string; readonly id: string }, Record<string, never>>({
            decoratorName: "@test()",
            metadataKey: COMMAND_METADATA,
            createDefaultOptions: () => ({}),
            validateOptions: () => {},
            buildMetadata: (methodName) => ({
                kind: "command",
                methodName,
                id: methodName,
            }),
        });

        const act = () => {
            class Service {
                @testDecorator()
                public static run(): void {}
            }

            return Service;
        };

        expect(act).toThrow(/static methods/i);

        expectElectroError(act, {
            type: DecoratorTargetError,
            code: "ELECTRO_DECORATOR_STATIC_METHOD_FORBIDDEN",
            context: {
                decorator: "@test()",
            },
        });
    });

    it("rejects duplicate Electro role", () => {
        const testDecorator = createMethodDecorator<{ readonly kind: "query"; readonly methodName: string; readonly id: string }, Record<string, never>>({
            decoratorName: "@test()",
            metadataKey: Symbol("test:query"),
            createDefaultOptions: () => ({}),
            validateOptions: () => {},
            buildMetadata: (methodName) => ({
                kind: "query",
                methodName,
                id: methodName,
            }),
        });

        const act = () => {
            const commandDecorator = createMethodDecorator({
                decoratorName: "@command()",
                metadataKey: COMMAND_METADATA,
                createDefaultOptions: () => ({}),
                validateOptions: () => {},
                buildMetadata: (methodName: string) => ({
                    kind: "command" as const,
                    methodName,
                    id: methodName,
                }),
            });

            class Service {
                @testDecorator()
                @commandDecorator()
                public run(): void {}
            }

            return Service;
        };

        expect(act).toThrow(/already has/i);

        expectElectroError(act, {
            type: MetadataConflictError,
            code: "ELECTRO_METADATA_METHOD_ROLE_CONFLICT",
        });
    });
});
