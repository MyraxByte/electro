import { describe, expect, it } from "vitest";
import { createNodeConfig } from "./vite-node-config";

describe("createNodeConfig()", () => {
    it("bundles @electro/runtime preload client subpaths", () => {
        const config = createNodeConfig({
            scope: "preload",
            root: "/workspace/app",
            entry: "/workspace/app/.electro/generated/preload/main.gen.ts",
            externals: [],
            outDir: "/workspace/app/.electro/preload",
            watch: false,
        });

        const noExternal = config.ssr?.noExternal;
        expect(Array.isArray(noExternal)).toBe(true);
        expect(noExternal).toHaveLength(1);

        const runtimePattern = noExternal?.[0];
        expect(runtimePattern).toBeInstanceOf(RegExp);
        expect((runtimePattern as RegExp).test("@electro/runtime")).toBe(true);
        expect((runtimePattern as RegExp).test("@electro/runtime/client")).toBe(true);
    });
});
