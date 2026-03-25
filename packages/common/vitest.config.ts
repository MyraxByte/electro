import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        name: "@electro/common",
        environment: "node",
        globals: true,
        setupFiles: ["./tests/setup.ts"],
        include: ["./tests/**/*.spec.ts"],
        exclude: ["dist/**", "./src/**", "node_modules/**"],
        coverage: {
            reporter: ["text", "html"],
            include: ["src/**/*.ts"],
            exclude: ["tests/**/*.spec.ts"],
        },
    },
});
