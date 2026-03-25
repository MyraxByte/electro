import { defineViewConfig } from "@electrojs/config";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import tanstackRouter from "@tanstack/router-plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineViewConfig({
    viewId: "auth",
    entry: "./index.html",
    plugins: [
        tailwindcss(),
        tanstackRouter({
            routesDirectory: resolve(import.meta.dirname, "./src/routes"),
            generatedRouteTree: resolve(import.meta.dirname, "./src/routeTree.gen.ts"),
        }),
        react(),
        babel({
            presets: [reactCompilerPreset()],
        }),
    ],
    resolve: {
        alias: {
            "@": resolve(import.meta.dirname, "./src"),
        },
    },
});
