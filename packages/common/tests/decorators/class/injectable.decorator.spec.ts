import { describe, expect, it } from "vitest";
import { Injectable } from "../../../src/decorators/class/injectable.decorator";
import { DecoratorConfigurationError, DecoratorTargetError } from "../../../src/errors";
import { getInjectableMetadata } from "../../../src/metadata";
import { expectElectroError } from "../../../src/utils/expect-electro-error";

describe("@Injectable()", () => {
    it("uses singleton scope by default", () => {
        @Injectable()
        class Service {}

        expect(getInjectableMetadata(Service)).toEqual({
            kind: "injectable",
            scope: "singleton",
        });
    });

    it("stores explicit transient scope", () => {
        @Injectable({ scope: "transient" })
        class Service {}

        expect(getInjectableMetadata(Service)).toEqual({
            kind: "injectable",
            scope: "transient",
        });
    });

    it("rejects invalid scope", () => {
        const act = () =>
            Injectable({
                scope: "request",
            } as never);

        expect(act).toThrow(/must be one of: "singleton", "transient"/i);

        expectElectroError(act, {
            type: DecoratorConfigurationError,
            code: "ELECTRO_DECORATOR_INVALID_SCOPE",
            context: {
                decorator: "@Injectable()",
                option: "scope",
                received: "request",
            },
        });
    });

    it("stores frozen metadata", () => {
        @Injectable()
        class Service {}

        const metadata = getInjectableMetadata(Service)!;

        expect(Object.isFrozen(metadata)).toBe(true);
    });

    it("rejects non-class target", () => {
        const decorator = Injectable();
        const act = () => decorator({} as never);

        expect(act).toThrow(/only be applied to classes/i);

        expectElectroError(act, {
            type: DecoratorTargetError,
            code: "ELECTRO_DECORATOR_INVALID_TARGET",
            context: {
                decorator: "@Injectable()",
            },
        });
    });
});
