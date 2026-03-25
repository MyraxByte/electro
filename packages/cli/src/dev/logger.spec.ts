import { afterEach, describe, expect, it, vi } from "vitest";
import { footer, logSession } from "./logger";

const ANSI_RE = new RegExp(String.raw`\u001B\[[0-9;]*m`, "g");

function getOutput(spy: ReturnType<typeof vi.spyOn>): string {
    return spy.mock.calls
        .flatMap((args) => args)
        .join("\n")
        .replace(ANSI_RE, "");
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe("footer()", () => {
    it("prints all ready endpoints", () => {
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

        footer("Ready in 1.2s", [
            { label: "renderer:main", url: "http://localhost:5173/" },
            { label: "renderer:auth", url: "http://localhost:5174/" },
        ]);

        const output = getOutput(logSpy);
        expect(output).toContain("renderer:main");
        expect(output).toContain("http://localhost:5173/");
        expect(output).toContain("renderer:auth");
        expect(output).toContain("http://localhost:5174/");
    });
});

describe("logSession()", () => {
    it("summarizes multiple views and still lists each configured entry", () => {
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

        logSession({
            root: "/workspace/app",
            runtime: "/workspace/app/runtime/main.ts",
            preload: "/workspace/app/.electro/generated/preload",
            views: [
                {
                    id: "main",
                    root: "/workspace/app/views/main",
                    entry: "/workspace/app/views/main/index.html",
                },
                {
                    id: "auth",
                    root: "/workspace/app/views/auth",
                    entry: "/workspace/app/views/auth/index.html",
                },
            ],
        });

        const output = getOutput(logSpy);
        expect(output).toContain("2 configured");
        expect(output).toContain("Views    2 configured");
        expect(output).toContain("main");
        expect(output).toContain("views/main/index.html");
        expect(output).toContain("auth");
        expect(output).toContain("views/auth/index.html");
    });
});
