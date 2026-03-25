import { describe, expect, it } from "vitest";
import { Injectable } from "../../src/decorators/class/injectable.decorator";
import { Module } from "../../src/decorators/class/module.decorator";
import { View } from "../../src/decorators/class/view.decorator";
import { Window } from "../../src/decorators/class/window.decorator";
import { Ref } from "../../src/di/ref";
import { ModuleConfigurationError } from "../../src/errors";
import { expectElectroError } from "../../src/utils/expect-electro-error";
import { ModuleOptionsValidator } from "../../src/validation/module-options.validator";

describe("ModuleOptionsValidator", () => {
    @Injectable()
    class ServiceA {}

    @Injectable()
    class ServiceB {}

    @View({ source: "view:main" })
    class MainView {}

    @Window({ id: "main" })
    class MainWindow {}

    @Module({})
    class ImportedModule {}

    @Module({})
    class AnotherModule {}

    it("accepts valid module options", () => {
        expect(() =>
            ModuleOptionsValidator.validate(
                {
                    id: "app",
                    imports: [ImportedModule],
                    providers: [ServiceA],
                    views: [MainView],
                    windows: [MainWindow],
                    exports: [ServiceB],
                },
                "@Module()",
            ),
        ).not.toThrow();
    });

    it("accepts valid Ref.create import", () => {
        expect(() =>
            ModuleOptionsValidator.validate(
                {
                    imports: [Ref.create(() => ImportedModule)],
                    providers: [Ref.create(() => ServiceA)],
                    views: [Ref.create(() => MainView)],
                    windows: [Ref.create(() => MainWindow)],
                    exports: [Ref.create(() => ServiceB)],
                },
                "@Module()",
            ),
        ).not.toThrow();
    });

    it("rejects invalid Ref.create import result", () => {
        const act = () =>
            ModuleOptionsValidator.validate(
                {
                    imports: [Ref.create(() => 123 as never)],
                },
                "@Module()",
            );

        expect(act).toThrow(/decorated module classes/i);

        expectElectroError(act, {
            type: ModuleConfigurationError,
            code: "ELECTRO_MODULE_INVALID_IMPORTS",
        });
    });

    it("rejects invalid Ref.create export result", () => {
        const act = () =>
            ModuleOptionsValidator.validate(
                {
                    exports: [Ref.create(() => AnotherModule as never)],
                },
                "@Module()",
            );

        expect(act).toThrow(/decorated declared classes/i);

        expectElectroError(act, {
            type: ModuleConfigurationError,
            code: "ELECTRO_MODULE_INVALID_EXPORTS",
        });
    });

    it("rejects throwing Ref.create import factory as invalid import", () => {
        const act = () =>
            ModuleOptionsValidator.validate(
                {
                    imports: [
                        Ref.create(() => {
                            throw new Error("boom");
                        }),
                    ],
                },
                "@Module()",
            );

        expect(act).toThrow(/decorated module classes/i);

        expectElectroError(act, {
            type: ModuleConfigurationError,
            code: "ELECTRO_MODULE_INVALID_IMPORTS",
        });
    });

    it("rejects throwing Ref.create provider factory as invalid provider", () => {
        const act = () =>
            ModuleOptionsValidator.validate(
                {
                    providers: [
                        Ref.create(() => {
                            throw new Error("boom");
                        }),
                    ],
                },
                "@Module()",
            );

        expect(act).toThrow(/decorated injectable classes/i);

        expectElectroError(act, {
            type: ModuleConfigurationError,
            code: "ELECTRO_MODULE_INVALID_PROVIDERS",
        });
    });

    it("rejects throwing Ref.create export factory as invalid export", () => {
        const act = () =>
            ModuleOptionsValidator.validate(
                {
                    exports: [
                        Ref.create(() => {
                            throw new Error("boom");
                        }),
                    ],
                },
                "@Module()",
            );

        expect(act).toThrow(/decorated declared classes/i);

        expectElectroError(act, {
            type: ModuleConfigurationError,
            code: "ELECTRO_MODULE_INVALID_EXPORTS",
        });
    });

    it("rejects view in providers", () => {
        const act = () =>
            ModuleOptionsValidator.validate(
                {
                    providers: [MainView],
                },
                "@Module()",
            );

        expect(act).toThrow(/decorated injectable classes/i);

        expectElectroError(act, {
            type: ModuleConfigurationError,
            code: "ELECTRO_MODULE_INVALID_PROVIDERS",
        });
    });

    it("rejects non-view in views", () => {
        const act = () =>
            ModuleOptionsValidator.validate(
                {
                    views: [ServiceA as never],
                },
                "@Module()",
            );

        expect(act).toThrow(/decorated view classes/i);

        expectElectroError(act, {
            type: ModuleConfigurationError,
            code: "ELECTRO_MODULE_INVALID_VIEWS",
        });
    });

    it("rejects non-window in windows", () => {
        const act = () =>
            ModuleOptionsValidator.validate(
                {
                    windows: [ServiceA as never],
                },
                "@Module()",
            );

        expect(act).toThrow(/decorated window classes/i);

        expectElectroError(act, {
            type: ModuleConfigurationError,
            code: "ELECTRO_MODULE_INVALID_WINDOWS",
        });
    });
});
