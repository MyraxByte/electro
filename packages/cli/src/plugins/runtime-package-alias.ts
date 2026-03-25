import { dirname, resolve } from "node:path";
import { normalizePath, type Plugin } from "vite";

export function runtimePackageAliasPlugin(runtimeConfigPath: string): Plugin {
    const runtimePackageRoot = resolve(dirname(runtimeConfigPath), "node_modules/@electro/runtime");
    const aliases = new Map<string, string>([
        ["@electro/runtime", normalizePath(resolve(runtimePackageRoot, "dist/index.mjs"))],
        ["@electro/runtime/client", normalizePath(resolve(runtimePackageRoot, "dist/client.mjs"))],
    ]);

    return {
        name: "electro:runtime-package-alias",
        enforce: "pre",
        resolveId(source) {
            return aliases.get(source) ?? null;
        },
    };
}
