import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        name: "@electrojs/codegen",
        environment: "node",
        globals: true,
        include: ["src/**/*.spec.ts", "tests/**/*.spec.ts"],
        exclude: ["dist/**", "node_modules/**"],
        coverage: {
            reporter: ["text", "html"],
            include: ["src/**/*.ts"],
            exclude: ["tests/**/*.spec.ts"],
        },
    },
});
