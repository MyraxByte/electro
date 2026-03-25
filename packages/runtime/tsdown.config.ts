import { defineConfig } from "tsdown";

export default defineConfig({
    entry: ["src/index.ts", "src/client.ts"],
    format: ["esm"],
    target: "esnext",
    platform: "node",
    dts: true,
    clean: true,
    outDir: "dist",
    treeshake: true,
});
