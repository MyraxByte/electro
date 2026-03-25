import { Injectable, Module, View, Window } from "@electro/common";
import { describe, expect, it } from "vitest";
import { scanModules } from "../src/modules/scanner";
import { validateAppDefinition } from "../src/modules/validator";

@Injectable()
class UserService {}

@View({
    source: "view:main",
})
class MainView {}

@Window({
    id: "main",
})
class MainWindow {}

@Module({
    providers: [UserService],
    views: [MainView],
    windows: [MainWindow],
    exports: [UserService, MainWindow],
})
class AppModule {}

describe("module declarations", () => {
    it("scans providers, views, and windows from separate module arrays", () => {
        const definition = scanModules(AppModule);
        const moduleDef = definition.modules[0];

        expect(moduleDef.providers.map((provider) => [provider.target.name, provider.kind])).toEqual([
            ["UserService", "provider"],
            ["MainView", "view"],
            ["MainWindow", "window"],
        ]);
        expect(definition.views.map((view) => view.id)).toEqual(["main"]);
        expect(definition.windows.map((window) => window.id)).toEqual(["main"]);
    });

    it("allows exporting windows declared in the module", () => {
        const definition = scanModules(AppModule);

        expect(() => validateAppDefinition(definition)).not.toThrow();
    });
});
