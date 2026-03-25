import { defineRuntimeConfig } from "@electro/config";

export default defineRuntimeConfig({
    entry: "./src/main.ts",
    ssr: {
        noExternal: ["@electron-toolkit/utils"],
    },
});
