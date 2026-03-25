import { describe, expect, it } from "vitest";
import { createSingleViewRendererConfig } from "./vite-renderer-config";

describe("createSingleViewRendererConfig()", () => {
    it("uses a dedicated cacheDir per renderer dev server", () => {
        const config = createSingleViewRendererConfig({
            view: {
                id: "auth",
                __source: "/workspace/apps/basic/src/renderer/views/auth/view.config.ts",
                root: "/workspace/apps/basic/src/renderer/views/auth",
                entry: "./index.html",
            },
            cacheDir: "/workspace/apps/basic/node_modules/.vite/electro/auth",
        });

        expect(config.root).toBe("/workspace/apps/basic/src/renderer/views/auth");
        expect(config.cacheDir).toBe("/workspace/apps/basic/node_modules/.vite/electro/auth");
    });
});
