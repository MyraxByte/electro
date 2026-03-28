import { defineViewConfig } from "@electrojs/config";
import { resolve } from "node:path";

export default defineViewConfig({
    viewId: "main",
    entry: "./index.html",
    plugins: [],
    resolve: {
        alias: {
            "@": resolve(import.meta.dirname, "./src"),
        },
    },
});
