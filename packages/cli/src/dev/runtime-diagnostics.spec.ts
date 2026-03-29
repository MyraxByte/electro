import { describe, expect, it } from "vitest";
import { createRuntimeDiagnosticsFormatter } from "./runtime-diagnostics";

const ANSI_RE = new RegExp(String.raw`\u001B\[[0-9;]*m`, "g");

function formatLines(lines: string[]): string[] {
    const formatter = createRuntimeDiagnosticsFormatter("pretty");
    return lines.flatMap((line) => formatter.formatLine(line)).map((line) => line.replace(ANSI_RE, ""));
}

describe("createRuntimeDiagnosticsFormatter()", () => {
    it("compacts kernel and module lifecycle logs in pretty mode", () => {
        const output = formatLines([
            "14:36:24 [electro] AppKernel → initializing",
            "14:36:24 [electro] SettingsModule → initializing",
            "14:36:24 [electro] SettingsModule → initialized",
            "14:36:24 [electro] StartupModule → initializing",
            "14:36:24 [electro] StartupModule → initialized",
            "14:36:24 [electro] AppKernel → initialized",
            "14:36:24 [electro] AppKernel → starting",
            "14:36:24 [electro] StartupModule → starting",
            "14:36:24 [electro] StartupWindow → created",
            "14:36:24 [electro] StartupView → loaded http://127.0.0.1:5176",
            "14:36:25 [electro] StartupWindow → shown",
            "14:36:25 [electro] SettingsModule → started",
            "14:36:25 [electro] StartupModule → started",
            "14:36:25 [electro] AppKernel → started",
        ]);

        expect(output).toEqual([
            "14:36:24 [electro] kernel initializing",
            "  ✓ SettingsModule initialized",
            "  ✓ StartupModule initialized",
            "14:36:24 [electro] kernel initialized (2 modules)",
            "14:36:24 [electro] kernel starting",
            "  ui StartupView loaded http://127.0.0.1:5176",
            "  ui StartupWindow shown",
            "  ✓ SettingsModule started",
            "  ✓ StartupModule started",
            "14:36:25 [electro] kernel started (2 modules)",
        ]);
    });

    it("keeps raw diagnostics unchanged in raw mode", () => {
        const formatter = createRuntimeDiagnosticsFormatter("raw");
        const output = formatter
            .formatLine("14:36:24 [electro] AppKernel → initializing")
            .map((line) => line.replace(ANSI_RE, ""));

        expect(output).toEqual(["14:36:24 [electro] AppKernel → initializing"]);
    });

    it("formats raw app lines inside pretty runtime output", () => {
        const output = formatLines(["Skip checkForUpdates because application is not packed and dev update config is not forced"]);

        expect(output).toEqual(["  app updater skipped update check (dev build)"]);
    });
});
