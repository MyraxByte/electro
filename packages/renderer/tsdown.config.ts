import { defineConfig } from "tsdown";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["esm"],
    target: "esnext",
    platform: "browser",
    dts: true,
    clean: true,
    outDir: "dist",
    treeshake: true,
});
