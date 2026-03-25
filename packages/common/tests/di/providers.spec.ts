import { describe, expect, it } from "vitest";
import { Module } from "../../src/decorators/class/module.decorator";
import { isClassProvider, isConstructor, isModule, isProvider, isProviderClass } from "../../src/di/providers";
import { Ref } from "../../src/di/ref";
import { createInjectionToken } from "../../src/di/tokens";

describe("provider guards", () => {
    class ServiceA {}

    @Module({})
    class AppModule {}

    const TOKEN = createInjectionToken<string>("TOKEN");

    it("recognizes constructor shorthand provider", () => {
        expect(isConstructor(ServiceA)).toBe(true);
        expect(isProviderClass(ServiceA)).toBe(true);
        expect(isProvider(ServiceA)).toBe(true);
    });

    it("recognizes valid class provider", () => {
        const provider = {
            provide: TOKEN,
            useClass: ServiceA,
        };

        expect(isClassProvider(provider)).toBe(true);
        expect(isProvider(provider)).toBe(true);
    });

    it("rejects value provider because it is not part of current Provider type", () => {
        const provider = {
            provide: TOKEN,
            useValue: "hello",
        };

        expect(isProvider(provider)).toBe(false);
    });

    it("rejects factory provider because it is not part of current Provider type", () => {
        const provider = {
            provide: TOKEN,
            useFactory: () => "hello",
            inject: [ServiceA],
        };

        expect(isProvider(provider)).toBe(false);
    });

    it("rejects existing provider because it is not part of current Provider type", () => {
        const provider = {
            provide: TOKEN,
            useExisting: ServiceA,
        };

        expect(isProvider(provider)).toBe(false);
    });

    it("rejects provider with multiple strategies", () => {
        const provider = {
            provide: TOKEN,
            useValue: "hello",
            useFactory: () => "world",
        };

        expect(isProvider(provider)).toBe(false);
    });

    it("rejects invalid useClass Ref.create resolution", () => {
        const provider = {
            provide: TOKEN,
            useClass: Ref.create(() => 123 as never),
        };

        expect(isProvider(provider)).toBe(false);
    });

    it("rejects invalid useExisting Ref.create resolution", () => {
        const provider = {
            provide: TOKEN,
            useExisting: Ref.create(() => 123 as never),
        };

        expect(isProvider(provider)).toBe(false);
    });

    it("rejects invalid factory inject list", () => {
        const provider = {
            provide: TOKEN,
            useFactory: () => "hello",
            inject: [123],
        };

        expect(isProvider(provider)).toBe(false);
    });

    it("recognizes decorated module class", () => {
        expect(isModule(AppModule)).toBe(true);
    });

    it("rejects non-decorated class as module", () => {
        class PlainClass {}

        expect(isModule(PlainClass)).toBe(false);
    });

    it("rejects dynamic module object", () => {
        const moduleValue = {
            module: AppModule,
        };

        expect(isModule(moduleValue)).toBe(false);
    });
});
