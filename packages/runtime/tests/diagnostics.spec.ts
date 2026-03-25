import { describe, expect, it } from "vitest";
import { formatDiagnosticLine, isDevDiagnosticsEnabled, resolveDiagnosticTarget } from "../src/diagnostics";

describe("diagnostics", () => {
    it("formats Electro diagnostic lines for the CLI output parser", () => {
        const now = new Date();
        now.setHours(12, 34, 56, 0);
        const line = formatDiagnosticLine("electro", "kernel.state", "idle → initializing", now);
        expect(line).toBe("12:34:56 [electro] kernel.state → idle → initializing");
    });

    it("enables diagnostics only when ELECTRO_DEV is set", () => {
        expect(isDevDiagnosticsEnabled({ ELECTRO_DEV: "true" })).toBe(true);
        expect(isDevDiagnosticsEnabled({ ELECTRO_DEV: "false" })).toBe(false);
        expect(isDevDiagnosticsEnabled({})).toBe(false);
    });

    it("resolves class names for user-facing diagnostic targets", () => {
        class SplashWindow {}

        expect(resolveDiagnosticTarget(new SplashWindow())).toBe("SplashWindow");
        expect(resolveDiagnosticTarget("AppKernel")).toBe("AppKernel");
    });
});
