import { describe, expect, it } from "vitest";
import type { AppDefinition } from "../src/modules/scanner";
import { validateAppDefinition } from "../src/modules/validator";

class AppModule {}
class SplashView {}

describe("validateAppDefinition()", () => {
    it("allows view signal allowlists without @signal() handlers", () => {
        const definition: AppDefinition = {
            rootModule: AppModule,
            modules: [
                {
                    id: "app",
                    target: AppModule,
                    imports: [],
                    providers: [],
                    exportTargets: [],
                },
            ],
            providers: [],
            views: [
                {
                    id: "splash",
                    ownerModuleId: "app",
                    source: "view:splash",
                    access: [],
                    signals: ["updater:status-changed"],
                    target: SplashView,
                },
            ],
            windows: [],
            bridgeMethods: [],
            signalHandlers: [],
            jobs: [],
        };

        expect(() => validateAppDefinition(definition)).not.toThrow();
    });
});
