import { describe, expect, it } from "vitest";
import { DecoratorConfigurationError, DecoratorTargetError } from "../../../src/errors";
import { getQueryMetadata } from "../../../src/metadata";
import { expectElectroError } from "../../../src/utils/expect-electro-error";
import { query } from "../../../src/decorators/method/query.decorator";

describe("@query()", () => {
    it("stores metadata with default id from method name", () => {
        class Service {
            @query()
            public getMe(this: void): void {}
        }

        expect(getQueryMetadata(Service.prototype.getMe)).toEqual({
            kind: "query",
            methodName: "getMe",
            id: "getMe",
        });
    });

    it("stores metadata with explicit id", () => {
        class Service {
            @query({ id: "auth:getMe" })
            public getMe(this: void): void {}
        }

        expect(getQueryMetadata(Service.prototype.getMe)).toEqual({
            kind: "query",
            methodName: "getMe",
            id: "auth:getMe",
        });
    });

    it("rejects empty explicit id", () => {
        const act = () => query({ id: "   " } as never);

        expect(act).toThrow(/must be a non-empty string/i);

        expectElectroError(act, {
            type: DecoratorConfigurationError,
            code: "ELECTRO_DECORATOR_INVALID_OPTION",
            context: {
                decorator: "@query()",
                option: "id",
            },
        });
    });

    it("rejects symbol-named methods", () => {
        const method = Symbol("getMe");

        const act = () => {
            class Service {
                @query()
                [method](): void {}
            }

            return Service;
        };

        expect(act).toThrow(/named instance methods/i);

        expectElectroError(act, {
            type: DecoratorTargetError,
            code: "ELECTRO_DECORATOR_INVALID_TARGET",
            context: {
                decorator: "@query()",
            },
        });
    });

    it("stores frozen metadata", () => {
        class Service {
            @query()
            public getMe(this: void): void {}
        }

        const metadata = getQueryMetadata(Service.prototype.getMe)!;

        expect(Object.isFrozen(metadata)).toBe(true);
    });
});
