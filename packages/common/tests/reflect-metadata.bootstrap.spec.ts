import { describe, expect, it } from "vitest";

describe("reflect-metadata bootstrap", () => {
    it("exposes metadata reflection helpers on the global Reflect object", async () => {
        await import("../src/reflect-metadata.bootstrap");

        expect(typeof Reflect.defineMetadata).toBe("function");
        expect(typeof Reflect.getMetadata).toBe("function");
        expect(typeof Reflect.getOwnMetadata).toBe("function");
        expect(typeof Reflect.hasOwnMetadata).toBe("function");
    });
});
