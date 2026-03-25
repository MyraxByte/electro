import { defineViewConfig } from "@electrojs/config";
import { resolve } from "node:path";

export default defineViewConfig({
    viewId: "settings",
    entry: "./index.html",
    resolve: {
        alias: {
            "@": resolve(import.meta.dirname, "./src"),
        },
    },
});
