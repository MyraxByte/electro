import { describe, expect, it } from "vitest";
import { Injectable } from "../../../src/decorators/class/injectable.decorator";
import { Module } from "../../../src/decorators/class/module.decorator";
import { View } from "../../../src/decorators/class/view.decorator";
import { Window } from "../../../src/decorators/class/window.decorator";
import { Ref } from "../../../src/di/ref";
import { ModuleConfigurationError } from "../../../src/errors";
import { getModuleMetadata } from "../../../src/metadata";
import { expectElectroError } from "../../../src/utils/expect-electro-error";

describe("@Module()", () => {
    @Module({})
    class ImportedModule {}

    @Module({})
    class AnotherModule {}

    @Injectable()
    class ServiceA {}

    @Injectable()
    class ServiceB {}

    @View({
        source: "view:main",
    })
    class MainView {}

    @Window({ id: "main" })
    class MainWindow {}

    class PlainClass {}

    it("stores module metadata", () => {
        @Module({
            id: "app",
            imports: [ImportedModule],
            providers: [ServiceA],
            views: [MainView],
            windows: [MainWindow],
            exports: [ServiceA],
        })
        class AppModule {}

        expect(getModuleMetadata(AppModule)).toEqual({
            kind: "module",
            id: "app",
            imports: [ImportedModule],
            providers: [ServiceA],
            views: [MainView],
            windows: [MainWindow],
            exports: [ServiceA],
        });
    });

    it("uses empty frozen arrays by default", () => {
        @Module({})
        class AppModule {}

        const metadata = getModuleMetadata(AppModule)!;

        expect(metadata.imports).toEqual([]);
        expect(metadata.providers).toEqual([]);
        expect(metadata.views).toEqual([]);
        expect(metadata.windows).toEqual([]);
        expect(metadata.exports).toEqual([]);

        expect(Object.isFrozen(metadata.imports)).toBe(true);
        expect(Object.isFrozen(metadata.providers)).toBe(true);
        expect(Object.isFrozen(metadata.views)).toBe(true);
        expect(Object.isFrozen(metadata.windows)).toBe(true);
        expect(Object.isFrozen(metadata.exports)).toBe(true);
    });

    it("stores cloned arrays instead of source references", () => {
        const imports = [ImportedModule];
        const providers = [ServiceA];
        const views = [MainView];
        const windows = [MainWindow];
        const exportsList = [ServiceA];

        @Module({
            imports,
            providers,
            views,
            windows,
            exports: exportsList,
        })
        class AppModule {}

        const metadata = getModuleMetadata(AppModule)!;

        expect(metadata.imports).toEqual([ImportedModule]);
        expect(metadata.providers).toEqual([ServiceA]);
        expect(metadata.views).toEqual([MainView]);
        expect(metadata.windows).toEqual([MainWindow]);
        expect(metadata.exports).toEqual([ServiceA]);

        expect(metadata.imports).not.toBe(imports);
        expect(metadata.providers).not.toBe(providers);
        expect(metadata.views).not.toBe(views);
        expect(metadata.windows).not.toBe(windows);
        expect(metadata.exports).not.toBe(exportsList);
    });

    it("stores frozen metadata and nested arrays", () => {
        @Module({
            id: "app",
            imports: [ImportedModule],
            providers: [ServiceA],
            views: [MainView],
            windows: [MainWindow],
            exports: [ServiceA],
        })
        class AppModule {}

        const metadata = getModuleMetadata(AppModule)!;

        expect(Object.isFrozen(metadata)).toBe(true);
        expect(Object.isFrozen(metadata.imports)).toBe(true);
        expect(Object.isFrozen(metadata.providers)).toBe(true);
        expect(Object.isFrozen(metadata.views)).toBe(true);
        expect(Object.isFrozen(metadata.windows)).toBe(true);
        expect(Object.isFrozen(metadata.exports)).toBe(true);

        expect(() => {
            (metadata.imports as unknown[]).push(AnotherModule);
        }).toThrow();

        expect(() => {
            (metadata.providers as unknown[]).push(ServiceB);
        }).toThrow();

        expect(() => {
            (metadata.views as unknown[]).push(MainView);
        }).toThrow();

        expect(() => {
            (metadata.windows as unknown[]).push(MainWindow);
        }).toThrow();

        expect(() => {
            (metadata.exports as unknown[]).push(ServiceB);
        }).toThrow();
    });

    it("accepts module imports", () => {
        @Module({
            imports: [ImportedModule],
        })
        class AppModule {}

        expect(getModuleMetadata(AppModule)?.imports).toEqual([ImportedModule]);
    });

    it("accepts injectable providers", () => {
        @Module({
            providers: [ServiceA],
        })
        class AppModule {}

        expect(getModuleMetadata(AppModule)?.providers).toEqual([ServiceA]);
    });

    it("accepts view declarations", () => {
        @Module({
            views: [MainView],
        })
        class AppModule {}

        expect(getModuleMetadata(AppModule)?.views).toEqual([MainView]);
    });

    it("accepts window declarations", () => {
        @Module({
            windows: [MainWindow],
        })
        class AppModule {}

        expect(getModuleMetadata(AppModule)?.windows).toEqual([MainWindow]);
    });

    it("accepts injectable exports", () => {
        @Module({
            exports: [ServiceA],
        })
        class AppModule {}

        expect(getModuleMetadata(AppModule)?.exports).toEqual([ServiceA]);
    });

    it("accepts Ref.create resolving to module in imports", () => {
        @Module({
            imports: [Ref.create(() => ImportedModule)],
        })
        class AppModule {}

        expect(getModuleMetadata(AppModule)?.imports).toHaveLength(1);
    });

    it("accepts Ref.create resolving to injectable in providers", () => {
        @Module({
            providers: [Ref.create(() => ServiceA)],
        })
        class AppModule {}

        expect(getModuleMetadata(AppModule)?.providers).toHaveLength(1);
    });

    it("accepts Ref.create resolving to view in views", () => {
        @Module({
            views: [Ref.create(() => MainView)],
        })
        class AppModule {}

        expect(getModuleMetadata(AppModule)?.views).toHaveLength(1);
    });

    it("accepts Ref.create resolving to window in windows", () => {
        @Module({
            windows: [Ref.create(() => MainWindow)],
        })
        class AppModule {}

        expect(getModuleMetadata(AppModule)?.windows).toHaveLength(1);
    });

    it("accepts Ref.create resolving to injectable in exports", () => {
        @Module({
            exports: [Ref.create(() => ServiceA)],
        })
        class AppModule {}

        expect(getModuleMetadata(AppModule)?.exports).toHaveLength(1);
    });

    it("accepts view and window exports", () => {
        @Module({
            exports: [MainView, MainWindow],
        })
        class AppModule {}

        expect(getModuleMetadata(AppModule)?.exports).toEqual([MainView, MainWindow]);
    });

    it("rejects plain class in imports", () => {
        const act = () =>
            Module({
                imports: [PlainClass],
            } as never);

        expect(act).toThrow();

        expectElectroError(act, {
            type: ModuleConfigurationError,
            code: "ELECTRO_MODULE_INVALID_IMPORTS",
        });
    });

    it("rejects injectable in imports", () => {
        const act = () =>
            Module({
                imports: [ServiceA],
            } as never);

        expect(act).toThrow();

        expectElectroError(act, {
            type: ModuleConfigurationError,
            code: "ELECTRO_MODULE_INVALID_IMPORTS",
        });
    });

    it("rejects non-class value in imports", () => {
        const act = () =>
            Module({
                imports: [123],
            } as never);

        expect(act).toThrow();

        expectElectroError(act, {
            type: ModuleConfigurationError,
            code: "ELECTRO_MODULE_INVALID_IMPORTS",
        });
    });

    it("rejects plain class in providers", () => {
        const act = () =>
            Module({
                providers: [PlainClass],
            } as never);

        expect(act).toThrow();

        expectElectroError(act, {
            type: ModuleConfigurationError,
            code: "ELECTRO_MODULE_INVALID_PROVIDERS",
        });
    });

    it("rejects module in providers", () => {
        const act = () =>
            Module({
                providers: [ImportedModule],
            } as never);

        expect(act).toThrow();

        expectElectroError(act, {
            type: ModuleConfigurationError,
            code: "ELECTRO_MODULE_INVALID_PROVIDERS",
        });
    });

    it("rejects view in providers", () => {
        const act = () =>
            Module({
                providers: [MainView],
            } as never);

        expect(act).toThrow();

        expectElectroError(act, {
            type: ModuleConfigurationError,
            code: "ELECTRO_MODULE_INVALID_PROVIDERS",
        });
    });

    it("rejects window in providers", () => {
        const act = () =>
            Module({
                providers: [MainWindow],
            } as never);

        expect(act).toThrow();

        expectElectroError(act, {
            type: ModuleConfigurationError,
            code: "ELECTRO_MODULE_INVALID_PROVIDERS",
        });
    });

    it("rejects non-class value in providers", () => {
        const act = () =>
            Module({
                providers: [123],
            } as never);

        expect(act).toThrow();

        expectElectroError(act, {
            type: ModuleConfigurationError,
            code: "ELECTRO_MODULE_INVALID_PROVIDERS",
        });
    });

    it("rejects injectable in views", () => {
        const act = () =>
            Module({
                views: [ServiceA],
            } as never);

        expect(act).toThrow();

        expectElectroError(act, {
            type: ModuleConfigurationError,
            code: "ELECTRO_MODULE_INVALID_VIEWS",
        });
    });

    it("rejects plain class in views", () => {
        const act = () =>
            Module({
                views: [PlainClass],
            } as never);

        expect(act).toThrow();

        expectElectroError(act, {
            type: ModuleConfigurationError,
            code: "ELECTRO_MODULE_INVALID_VIEWS",
        });
    });

    it("rejects injectable in windows", () => {
        const act = () =>
            Module({
                windows: [ServiceA],
            } as never);

        expect(act).toThrow();

        expectElectroError(act, {
            type: ModuleConfigurationError,
            code: "ELECTRO_MODULE_INVALID_WINDOWS",
        });
    });

    it("rejects plain class in windows", () => {
        const act = () =>
            Module({
                windows: [PlainClass],
            } as never);

        expect(act).toThrow();

        expectElectroError(act, {
            type: ModuleConfigurationError,
            code: "ELECTRO_MODULE_INVALID_WINDOWS",
        });
    });

    it("rejects plain class in exports", () => {
        const act = () =>
            Module({
                exports: [PlainClass],
            } as never);

        expect(act).toThrow();

        expectElectroError(act, {
            type: ModuleConfigurationError,
            code: "ELECTRO_MODULE_INVALID_EXPORTS",
        });
    });

    it("rejects module in exports", () => {
        const act = () =>
            Module({
                exports: [ImportedModule],
            } as never);

        expect(act).toThrow();

        expectElectroError(act, {
            type: ModuleConfigurationError,
            code: "ELECTRO_MODULE_INVALID_EXPORTS",
        });
    });

    it("rejects non-class value in exports", () => {
        const act = () =>
            Module({
                exports: [123],
            } as never);

        expect(act).toThrow();

        expectElectroError(act, {
            type: ModuleConfigurationError,
            code: "ELECTRO_MODULE_INVALID_EXPORTS",
        });
    });

    it("rejects Ref.create resolving to injectable in imports", () => {
        const act = () =>
            Module({
                imports: [Ref.create(() => ServiceA)],
            });

        expect(act).toThrow();

        expectElectroError(act, {
            type: ModuleConfigurationError,
            code: "ELECTRO_MODULE_INVALID_IMPORTS",
        });
    });

    it("rejects Ref.create resolving to plain class in imports", () => {
        const act = () =>
            Module({
                imports: [Ref.create(() => PlainClass)],
            });

        expect(act).toThrow();

        expectElectroError(act, {
            type: ModuleConfigurationError,
            code: "ELECTRO_MODULE_INVALID_IMPORTS",
        });
    });

    it("rejects Ref.create resolving to module in providers", () => {
        const act = () =>
            Module({
                providers: [Ref.create(() => ImportedModule)],
            });

        expect(act).toThrow();

        expectElectroError(act, {
            type: ModuleConfigurationError,
            code: "ELECTRO_MODULE_INVALID_PROVIDERS",
        });
    });

    it("rejects Ref.create resolving to view in providers", () => {
        const act = () =>
            Module({
                providers: [Ref.create(() => MainView)],
            });

        expect(act).toThrow();

        expectElectroError(act, {
            type: ModuleConfigurationError,
            code: "ELECTRO_MODULE_INVALID_PROVIDERS",
        });
    });

    it("rejects Ref.create resolving to plain class in providers", () => {
        const act = () =>
            Module({
                providers: [Ref.create(() => PlainClass)],
            });

        expect(act).toThrow();

        expectElectroError(act, {
            type: ModuleConfigurationError,
            code: "ELECTRO_MODULE_INVALID_PROVIDERS",
        });
    });

    it("rejects Ref.create resolving to injectable in views", () => {
        const act = () =>
            Module({
                views: [Ref.create(() => ServiceA)],
            });

        expect(act).toThrow();

        expectElectroError(act, {
            type: ModuleConfigurationError,
            code: "ELECTRO_MODULE_INVALID_VIEWS",
        });
    });

    it("rejects Ref.create resolving to injectable in windows", () => {
        const act = () =>
            Module({
                windows: [Ref.create(() => ServiceA)],
            });

        expect(act).toThrow();

        expectElectroError(act, {
            type: ModuleConfigurationError,
            code: "ELECTRO_MODULE_INVALID_WINDOWS",
        });
    });

    it("rejects Ref.create resolving to module in exports", () => {
        const act = () =>
            Module({
                exports: [Ref.create(() => ImportedModule)],
            });

        expect(act).toThrow();

        expectElectroError(act, {
            type: ModuleConfigurationError,
            code: "ELECTRO_MODULE_INVALID_EXPORTS",
        });
    });

    it("rejects Ref.create resolving to plain class in exports", () => {
        const act = () =>
            Module({
                exports: [Ref.create(() => PlainClass)],
            });

        expect(act).toThrow();

        expectElectroError(act, {
            type: ModuleConfigurationError,
            code: "ELECTRO_MODULE_INVALID_EXPORTS",
        });
    });
});
