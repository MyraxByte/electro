import { describe, expect, it } from "vitest";
import { createInjectionToken, Ref } from "../../src/di";
import { TokenConfigurationError } from "../../src/errors";
import { expectElectroError } from "../../src/utils/expect-electro-error";
import { TokenValidator } from "../../src/validation/token.validator";

describe("TokenValidator", () => {
    class ServiceA {}

    const TOKEN = createInjectionToken<string>("TOKEN");

    it("accepts class token", () => {
        expect(TokenValidator.isInjectionToken(ServiceA)).toBe(true);
    });

    it("accepts symbol token object", () => {
        expect(TokenValidator.isInjectionToken(TOKEN)).toBe(true);
    });

    it("accepts valid resolvable token", () => {
        expect(TokenValidator.isResolvableInjectionToken(Ref.create(() => TOKEN))).toBe(true);
    });

    it("rejects invalid resolvable token result", () => {
        expect(TokenValidator.isResolvableInjectionToken(Ref.create(() => 123 as never))).toBe(false);
    });

    it("rejects throwing resolvable token result", () => {
        expect(
            TokenValidator.isResolvableInjectionToken(
                Ref.create(() => {
                    throw new Error("boom");
                }),
            ),
        ).toBe(false);
    });

    it("accepts valid resolvable constructor", () => {
        expect(TokenValidator.isResolvableConstructor(Ref.create(() => ServiceA))).toBe(true);
    });

    it("rejects invalid resolvable constructor result", () => {
        expect(TokenValidator.isResolvableConstructor(Ref.create(() => 123 as never))).toBe(false);
    });

    it("rejects throwing resolvable constructor result", () => {
        expect(
            TokenValidator.isResolvableConstructor(
                Ref.create(() => {
                    throw new Error("boom");
                }),
            ),
        ).toBe(false);
    });

    it("ensureInjectionToken rejects invalid token", () => {
        const act = () => TokenValidator.ensureInjectionToken(123);

        expect(act).toThrow(/Injection token is invalid/i);

        expectElectroError(act, {
            type: TokenConfigurationError,
            code: "ELECTRO_TOKEN_INVALID",
            context: {
                received: 123,
            },
        });
    });

    it("ensureResolvableInjectionToken rejects invalid token", () => {
        const act = () => TokenValidator.ensureResolvableInjectionToken(123);

        expect(act).toThrow(/Injection token is invalid/i);

        expectElectroError(act, {
            type: TokenConfigurationError,
            code: "ELECTRO_TOKEN_INVALID",
            context: {
                received: 123,
            },
        });
    });

    it("ensureResolvableInjectionToken rejects throwing Ref.create token", () => {
        const act = () =>
            TokenValidator.ensureResolvableInjectionToken(
                Ref.create(() => {
                    throw new Error("boom");
                }),
            );

        expect(act).toThrow(/Injection token is invalid/i);

        expectElectroError(act, {
            type: TokenConfigurationError,
            code: "ELECTRO_TOKEN_INVALID",
        });
    });

    it("ensureResolvableConstructor rejects invalid constructor", () => {
        const act = () => TokenValidator.ensureResolvableConstructor(123);

        expect(act).toThrow(/Injection token is invalid/i);

        expectElectroError(act, {
            type: TokenConfigurationError,
            code: "ELECTRO_TOKEN_INVALID",
            context: {
                received: 123,
            },
        });
    });

    it("ensureResolvableConstructor rejects throwing Ref.create constructor", () => {
        const act = () =>
            TokenValidator.ensureResolvableConstructor(
                Ref.create(() => {
                    throw new Error("boom");
                }),
            );

        expect(act).toThrow(/Injection token is invalid/i);

        expectElectroError(act, {
            type: TokenConfigurationError,
            code: "ELECTRO_TOKEN_INVALID",
        });
    });
});
