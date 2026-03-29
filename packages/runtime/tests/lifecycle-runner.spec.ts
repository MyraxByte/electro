import { afterEach, describe, expect, it, vi } from "vitest";
import { runInitialization, runShutdown, runStartup } from "../src/app/lifecycle-runner";
import type { Injector } from "../src/container/injector";
import { ModuleRef } from "../src/modules/refs";

class AppModule {}
class AuthModule {}

function createModuleRef(id: string, instance: object): ModuleRef {
    return new ModuleRef(id, instance.constructor as typeof AppModule, {} as Injector, instance, [], new Set());
}

function stripTimestamp(output: string): string[] {
    return output
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.replace(/^\d{2}:\d{2}:\d{2} \[electro\] /, ""));
}

describe("lifecycle diagnostics", () => {
    afterEach(() => {
        delete process.env.ELECTRO_DEV;
        vi.restoreAllMocks();
    });

    it("logs module startup and shutdown order by class name", async () => {
        process.env.ELECTRO_DEV = "true";
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        const appRef = createModuleRef("app", new AppModule());
        const authRef = createModuleRef("auth", new AuthModule());

        await runInitialization([appRef, authRef]);
        await runStartup([appRef, authRef]);
        await runShutdown([appRef, authRef]);

        expect(stripTimestamp(logSpy.mock.calls.flat().join("\n"))).toEqual([
            "AppModule → initializing",
            "AppModule → initialized",
            "AuthModule → initializing",
            "AuthModule → initialized",
            "AppModule → starting",
            "AuthModule → starting",
            "AppModule → started",
            "AuthModule → started",
            "AuthModule → stopping",
            "AppModule → stopping",
            "AuthModule → stopped",
            "AppModule → stopped",
        ]);
    });
});
