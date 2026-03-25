import { describe, expect, it } from "vitest";
import { TokenConfigurationError } from "../../src/errors";
import { expectElectroError } from "../../src/utils/expect-electro-error";
import { Ref } from "../../src/di/ref";

describe("Ref", () => {
    it("creates branded forward reference", () => {
        class Token {}

        const ref = Ref.create(() => Token);

        expect(Ref.isRef(ref)).toBe(true);
        expect(Ref.resolve(ref)).toBe(Token);
        expect(Object.isFrozen(ref)).toBe(true);
    });

    it("rejects non-function factory", () => {
        const act = () => Ref.create(123 as never);

        expect(act).toThrow(/expects a function/i);

        expectElectroError(act, {
            type: TokenConfigurationError,
            code: "ELECTRO_FORWARD_REF_INVALID_FACTORY",
            context: {
                received: 123,
            },
        });
    });

    it("does not treat plain object as forwardRef", () => {
        const fake = {
            forwardRef: () => String,
        };

        expect(Ref.isRef(fake)).toBe(false);
    });

    it("recognizes branded forwardRef only", () => {
        const fake = {
            forwardRef: () => String,
            [Symbol("electro:forward-ref")]: true,
        };

        expect(Ref.isRef(fake)).toBe(false);
    });
});
