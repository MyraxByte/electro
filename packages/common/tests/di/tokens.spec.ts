import { describe, expect, it } from "vitest";
import { TokenConfigurationError } from "../../src/errors";
import { expectElectroError } from "../../src/utils/expect-electro-error";
import { createInjectionToken, describeInjectionToken, isInjectionTokenSymbol } from "../../src/di/tokens";

describe("createInjectionToken()", () => {
    it("creates frozen token object", () => {
        const TOKEN = createInjectionToken<string>("API_URL");

        expect(TOKEN.kind).toBe("injection-token");
        expect(TOKEN.description).toBe("API_URL");
        expect(typeof TOKEN.key).toBe("symbol");
        expect(isInjectionTokenSymbol(TOKEN)).toBe(true);
        expect(Object.isFrozen(TOKEN)).toBe(true);
    });

    it("trims description", () => {
        const TOKEN = createInjectionToken<string>("  API_URL  ");
        expect(TOKEN.description).toBe("API_URL");
    });

    it("rejects empty description", () => {
        const act = () => createInjectionToken("   ");

        expect(act).toThrow(/requires a non-empty description string/i);

        expectElectroError(act, {
            type: TokenConfigurationError,
            code: "ELECTRO_TOKEN_INVALID_DESCRIPTION",
            context: {
                received: "   ",
            },
        });
    });

    it("creates unique symbols even for same description", () => {
        const first = createInjectionToken("AUTH_TOKEN");
        const second = createInjectionToken("AUTH_TOKEN");

        expect(first.description).toBe(second.description);
        expect(first.key).not.toBe(second.key);
    });

    it("describes class token", () => {
        class AuthService {}

        expect(describeInjectionToken(AuthService)).toBe("AuthService");
    });

    it("describes injection token", () => {
        const TOKEN = createInjectionToken("AUTH_TOKEN");

        expect(describeInjectionToken(TOKEN)).toBe("AUTH_TOKEN");
    });

    it("describes class token using runtime class name", () => {
        const Anonymous = class {};

        expect(describeInjectionToken(Anonymous)).toBe(Anonymous.name || "<anonymous class>");
    });
});
