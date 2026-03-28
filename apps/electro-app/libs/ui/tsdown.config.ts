import { defineConfig } from "tsdown";
import Icons from "unplugin-icons/rolldown";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["esm"],
    target: "esnext",
    platform: "browser",
    dts: true,
    clean: true,
    outDir: "dist",
    treeshake: true,
    minify: true,
    copy: ["src/assets"],
    plugins: [Icons({ compiler: "jsx", jsx: "react" })],
    loader: {
        ".svg": "asset",
        ".png": "asset",
        ".jpg": "asset",
        ".jpeg": "asset",
        ".webp": "asset",
    },
});
