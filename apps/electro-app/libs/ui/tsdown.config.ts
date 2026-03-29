import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { transform } from "@svgr/core";
import jsx from "@svgr/plugin-jsx";
import { defineConfig, type Rolldown } from "tsdown";
import Icons from "unplugin-icons/rolldown";

const SVG_COMPONENT_QUERY = "?react";

function toComponentName(filePath: string): string {
    return (
        basename(filePath, ".svg")
            .replace(/[^a-zA-Z0-9]+(.)/g, (_, char: string) => char.toUpperCase())
            .replace(/^[a-z]/, (char) => char.toUpperCase())
            .replace(/[^a-zA-Z0-9]/g, "") || "SvgAsset"
    );
}

function svgrPlugin(): Rolldown.Plugin {
    return {
        name: "svgr",
        async resolveId(source, importer, options) {
            if (!source.endsWith(SVG_COMPONENT_QUERY)) return null;

            const resolved = await this.resolve(source.slice(0, -SVG_COMPONENT_QUERY.length), importer, {
                ...options,
                skipSelf: true,
            });

            return resolved ? `${resolved.id}${SVG_COMPONENT_QUERY}` : null;
        },
        async load(id) {
            if (!id.endsWith(SVG_COMPONENT_QUERY)) return null;

            const filePath = id.slice(0, -SVG_COMPONENT_QUERY.length);
            const svg = await readFile(filePath, "utf8");
            const code = await transform(
                svg,
                {
                    plugins: [jsx],
                    exportType: "default",
                    jsxRuntime: "automatic",
                },
                {
                    componentName: toComponentName(filePath),
                    filePath,
                },
            );

            return {
                code,
                moduleType: "jsx",
            };
        },
    };
}

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
    copy: [{ from: "src/assets/css/index.css", to: "dist/assets/css" }],
    plugins: [svgrPlugin(), Icons({ compiler: "jsx", jsx: "react" })],
    loader: {
        ".svg": "asset",
        ".png": "asset",
        ".jpg": "asset",
        ".jpeg": "asset",
        ".webp": "asset",
    },
});
