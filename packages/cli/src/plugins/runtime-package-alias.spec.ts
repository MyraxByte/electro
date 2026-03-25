import { describe, expect, it } from "vitest";
import { runtimePackageAliasPlugin } from "./runtime-package-alias";

describe("runtimePackageAliasPlugin()", () => {
    it("resolves generated preload runtime imports from the runtime workspace package", async () => {
        const plugin = runtimePackageAliasPlugin("/workspace/app/packages/runtime/runtime.config.ts");
        const clientId = await plugin.resolveId?.("@electrojs/runtime/client");
        const runtimeId = await plugin.resolveId?.("@electrojs/runtime");

        expect(clientId).toBe("/workspace/app/packages/runtime/node_modules/@electrojs/runtime/dist/client.mjs");
        expect(runtimeId).toBe("/workspace/app/packages/runtime/node_modules/@electrojs/runtime/dist/index.mjs");
    });
});
