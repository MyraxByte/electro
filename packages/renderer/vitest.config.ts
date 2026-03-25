import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        name: "@electro/renderer",
        globals: true,
        environment: "jsdom",
        restoreMocks: true,
        clearMocks: true,
        mockReset: true,
        passWithNoTests: false,
        include: ["tests/**/*.spec.ts"],
        exclude: ["dist/**", "./src/**", "node_modules/**"],
        coverage: {
            reporter: ["text", "html", "lcov"],
            include: ["src/**/*.ts"],
            exclude: ["tests/**/*.spec.ts"],
        },
        browser: {
            provider: playwright(),
            instances: [{ browser: "chromium" }],
        },
    },
});
