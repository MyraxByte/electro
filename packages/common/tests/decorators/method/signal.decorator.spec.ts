import { describe, expect, it } from "vitest";
import { signal } from "../../../src/decorators/method/signal.decorator";
import { DecoratorConfigurationError } from "../../../src/errors";
import { getSignalMetadata } from "../../../src/metadata";
import { expectElectroError } from "../../../src/utils/expect-electro-error";

describe("@signal()", () => {
    it("stores metadata", () => {
        class Service {
            @signal({ id: "auth:user-logged-in" })
            public onLogin(this: void): void {}
        }

        expect(getSignalMetadata(Service.prototype.onLogin)).toEqual({
            kind: "signal",
            methodName: "onLogin",
            id: "auth:user-logged-in",
        });
    });

    it("uses method name as default id when not provided", () => {
        class Service {
            @signal()
            public onEvent(this: void): void {}
        }

        expect(getSignalMetadata(Service.prototype.onEvent)).toEqual({
            kind: "signal",
            methodName: "onEvent",
            id: "onEvent",
        });
    });

    it("rejects empty id", () => {
        const act = () => signal({ id: " " } as never);

        expect(act).toThrow(/must be a non-empty string/i);

        expectElectroError(act, {
            type: DecoratorConfigurationError,
            code: "ELECTRO_DECORATOR_INVALID_OPTION",
            context: {
                decorator: "@signal()",
                option: "id",
            },
        });
    });

    it("stores frozen metadata", () => {
        class Service {
            @signal({ id: "auth:user-logged-in" })
            public onLogin(this: void): void {}
        }

        const metadata = getSignalMetadata(Service.prototype.onLogin)!;

        expect(Object.isFrozen(metadata)).toBe(true);
    });
});
