import { afterEach, describe, expect, it, vi } from "vitest";
import { emitDevDiagnostic } from "../src/diagnostics";
import { createConsoleLogger, setRuntimeLogger, type ElectroLogContext, type ElectroLogger } from "../src/logging";

function createMemoryLogger(entries: Array<{ level: string; target?: string; message: string; context?: ElectroLogContext }>, target?: string): ElectroLogger {
    return {
        debug(message, context) {
            entries.push({ level: "debug", target, message, context });
        },
        info(message, context) {
            entries.push({ level: "info", target, message, context });
        },
        warn(message, context) {
            entries.push({ level: "warn", target, message, context });
        },
        error(message, context) {
            entries.push({ level: "error", target, message, context });
        },
        child(bindings) {
            return createMemoryLogger(entries, bindings.target ?? target);
        },
    };
}

describe("logging", () => {
    afterEach(() => {
        delete process.env.ELECTRO_DEV;
        setRuntimeLogger(undefined);
        vi.restoreAllMocks();
    });

    it("formats console logger output with the bound target", () => {
        process.env.ELECTRO_DEV = "true";
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        const logger = createConsoleLogger().child({ target: "AuthModule" });

        logger.info("checking auth session");

        expect(logSpy).toHaveBeenCalledTimes(1);
        expect(logSpy.mock.calls[0]?.[0]).toMatch(/^\d{2}:\d{2}:\d{2} \[electro\] AuthModule → checking auth session$/);
    });

    it("routes framework diagnostics through the active custom logger", () => {
        const entries: Array<{ level: string; target?: string; message: string; context?: ElectroLogContext }> = [];
        setRuntimeLogger(createMemoryLogger(entries));

        emitDevDiagnostic("AppKernel", "started");

        expect(entries).toEqual([
            {
                level: "info",
                target: "AppKernel",
                message: "started",
                context: undefined,
            },
        ]);
    });
});
