import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        name: "@electrojs/runtime",
        environment: "node",
        globals: true,
        include: ["tests/**/*.spec.ts"],
        exclude: ["dist/**", "./src/**", "node_modules/**"],
        coverage: {
            reporter: ["text", "html"],
            include: ["src/**/*.ts"],
            exclude: ["tests/**/*.spec.ts"],
        },
    },
});
