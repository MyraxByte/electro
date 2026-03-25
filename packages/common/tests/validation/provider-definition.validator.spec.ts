import { describe, expect, it } from "vitest";
import { createInjectionToken, Ref } from "../../src/di";
import { ProviderConfigurationError } from "../../src/errors";
import { expectElectroError } from "../../src/utils/expect-electro-error";
import { ProviderDefinitionValidator } from "../../src/validation/provider-definition.validator";

describe("ProviderDefinitionValidator", () => {
    class ServiceA {}
    class ServiceB {}

    const TOKEN = createInjectionToken<string>("TOKEN");

    it("accepts constructor shorthand", () => {
        expect(() => ProviderDefinitionValidator.validate(ServiceA)).not.toThrow();
    });

    it("accepts valid class provider", () => {
        expect(() =>
            ProviderDefinitionValidator.validate({
                provide: ServiceA,
                useClass: ServiceB,
            }),
        ).not.toThrow();
    });

    it("rejects value provider", () => {
        const act = () =>
            ProviderDefinitionValidator.validate({
                provide: TOKEN,
                useValue: "hello",
            });

        expect(act).toThrow(/exactly one strategy/i);

        expectElectroError(act, {
            type: ProviderConfigurationError,
            code: "ELECTRO_PROVIDER_INVALID_STRATEGY_COMBINATION",
        });
    });

    it("rejects factory provider", () => {
        const act = () =>
            ProviderDefinitionValidator.validate({
                provide: TOKEN,
                useFactory: () => "hello",
                inject: [ServiceA],
            });

        expect(act).toThrow(/exactly one strategy/i);

        expectElectroError(act, {
            type: ProviderConfigurationError,
            code: "ELECTRO_PROVIDER_INVALID_STRATEGY_COMBINATION",
        });
    });

    it("rejects existing provider", () => {
        const act = () =>
            ProviderDefinitionValidator.validate({
                provide: TOKEN,
                useExisting: ServiceA,
            });

        expect(act).toThrow(/exactly one strategy/i);

        expectElectroError(act, {
            type: ProviderConfigurationError,
            code: "ELECTRO_PROVIDER_INVALID_STRATEGY_COMBINATION",
        });
    });

    it("rejects multiple strategies", () => {
        const act = () =>
            ProviderDefinitionValidator.validate({
                provide: TOKEN,
                useClass: ServiceA,
                useValue: "x",
            } as never);

        expect(act).toThrow(/exactly one strategy/i);

        expectElectroError(act, {
            type: ProviderConfigurationError,
            code: "ELECTRO_PROVIDER_INVALID_STRATEGY_COMBINATION",
        });
    });

    it("rejects invalid useClass resolution", () => {
        const act = () =>
            ProviderDefinitionValidator.validate({
                provide: TOKEN,
                useClass: Ref.create(() => 123 as never),
            });

        expect(act).toThrow(/useClass/i);

        expectElectroError(act, {
            type: ProviderConfigurationError,
            code: "ELECTRO_PROVIDER_INVALID_USE_CLASS",
        });
    });

    it("rejects throwing useClass resolution", () => {
        const act = () =>
            ProviderDefinitionValidator.validate({
                provide: TOKEN,
                useClass: Ref.create(() => {
                    throw new Error("boom");
                }),
            });

        expect(act).toThrow(/useClass/i);

        expectElectroError(act, {
            type: ProviderConfigurationError,
            code: "ELECTRO_PROVIDER_INVALID_USE_CLASS",
        });
    });

    it("rejects missing provide", () => {
        const act = () =>
            ProviderDefinitionValidator.validate({
                useClass: ServiceA,
            } as never);

        expect(act).toThrow(/must declare a valid "provide" token/i);

        expectElectroError(act, {
            type: ProviderConfigurationError,
            code: "ELECTRO_PROVIDER_MISSING_PROVIDE",
        });
    });

    it("rejects non-object provider", () => {
        const act = () => ProviderDefinitionValidator.validate(123);

        expect(act).toThrow(/invalid/i);

        expectElectroError(act, {
            type: ProviderConfigurationError,
            code: "ELECTRO_PROVIDER_INVALID",
        });
    });
});
