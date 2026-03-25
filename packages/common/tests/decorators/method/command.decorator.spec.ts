import { describe, expect, it } from "vitest";
import { DecoratorConfigurationError, DecoratorTargetError } from "../../../src/errors";
import { getCommandMetadata } from "../../../src/metadata";
import { expectElectroError } from "../../../src/utils/expect-electro-error";
import { command } from "../../../src/decorators/method/command.decorator";

describe("@command()", () => {
    it("stores metadata with default id from method name", () => {
        class Service {
            @command()
            public save(this: void): void {}
        }

        expect(getCommandMetadata(Service.prototype.save)).toEqual({
            kind: "command",
            methodName: "save",
            id: "save",
        });
    });

    it("stores metadata with explicit id", () => {
        class Service {
            @command({ id: "auth:login" })
            public login(this: void): void {}
        }

        expect(getCommandMetadata(Service.prototype.login)).toEqual({
            kind: "command",
            methodName: "login",
            id: "auth:login",
        });
    });

    it("rejects empty explicit id", () => {
        const act = () => command({ id: "   " } as never);

        expect(act).toThrow(/must be a non-empty string/i);

        expectElectroError(act, {
            type: DecoratorConfigurationError,
            code: "ELECTRO_DECORATOR_INVALID_OPTION",
            context: {
                decorator: "@command()",
                option: "id",
            },
        });
    });

    it("rejects static methods", () => {
        const act = () => {
            class Service {
                @command()
                public static save(): void {}
            }

            return Service;
        };

        expect(act).toThrow(/cannot be applied to static methods/i);

        expectElectroError(act, {
            type: DecoratorTargetError,
            code: "ELECTRO_DECORATOR_STATIC_METHOD_FORBIDDEN",
            context: {
                decorator: "@command()",
            },
        });
    });

    it("rejects getters", () => {
        const act = () => {
            class Service {
                @command()
                public get value(): string {
                    return "x";
                }
            }

            return Service;
        };

        expect(act).toThrow(/named instance methods/i);

        expectElectroError(act, {
            type: DecoratorTargetError,
            code: "ELECTRO_DECORATOR_INVALID_TARGET",
            context: {
                decorator: "@command()",
            },
        });
    });

    it("rejects symbol-named methods", () => {
        const method = Symbol("save");

        const act = () => {
            class Service {
                @command()
                [method](): void {}
            }

            return Service;
        };

        expect(act).toThrow(/named instance methods/i);

        expectElectroError(act, {
            type: DecoratorTargetError,
            code: "ELECTRO_DECORATOR_INVALID_TARGET",
            context: {
                decorator: "@command()",
            },
        });
    });

    it("stores frozen metadata", () => {
        class Service {
            @command()
            public save(this: void): void {}
        }

        const metadata = getCommandMetadata(Service.prototype.save)!;

        expect(Object.isFrozen(metadata)).toBe(true);
    });
});
