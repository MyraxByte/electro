import { defineViewConfig } from "@electro/config";
import babel from "@rolldown/plugin-babel";
import tailwind from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { resolve } from "node:path";
import Icons from "unplugin-icons/vite";

export default defineViewConfig({
    viewId: "startup",
    entry: "./index.html",
    plugins: [
        react(),
        babel({
            presets: [reactCompilerPreset()],
        }),
        tailwind(),
        Icons({ compiler: "jsx", jsx: "react" }),
    ],
    resolve: {
        alias: {
            "@": resolve(import.meta.dirname, "./src"),
        },
    },
});
