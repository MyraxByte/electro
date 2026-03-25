import { defineViewConfig } from "@electro/config";
import { resolve } from "node:path";

export default defineViewConfig({
    viewId: "main",
    entry: "./index.html",
    devtools: {
        enabled: true,
    },
    plugins: [],
    resolve: {
        alias: {
            "@": resolve(import.meta.dirname, "./src"),
        },
    },
});
