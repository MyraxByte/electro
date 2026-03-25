import { describe, expect, it } from "vitest";
import { defineMetadata, getMetadata, getOwnMetadata, hasOwnMetadata } from "../../src/metadata/helpers";

describe("metadata helpers", () => {
    it("defines and reads metadata on object target", () => {
        const KEY = Symbol("meta");
        const target = {};

        defineMetadata(KEY, "value", target);

        expect(getMetadata(KEY, target)).toBe("value");
        expect(getOwnMetadata(KEY, target)).toBe("value");
        expect(hasOwnMetadata(KEY, target)).toBe(true);
    });

    it("defines and reads metadata on property target", () => {
        const KEY = Symbol("meta");
        const target = {};

        defineMetadata(KEY, "value", target, "name");

        expect(getMetadata(KEY, target, "name")).toBe("value");
        expect(getOwnMetadata(KEY, target, "name")).toBe("value");
        expect(hasOwnMetadata(KEY, target, "name")).toBe(true);
    });

    it("getMetadata reads from prototype chain", () => {
        const KEY = Symbol("meta");
        const base = {};
        const child = Object.create(base);

        defineMetadata(KEY, "base-value", base);

        expect(getMetadata(KEY, child)).toBe("base-value");
        expect(getOwnMetadata(KEY, child)).toBeUndefined();
    });

    it("getOwnMetadata does not read from prototype chain", () => {
        const KEY = Symbol("meta");
        const base = {};
        const child = Object.create(base);

        defineMetadata(KEY, "base-value", base);

        expect(getOwnMetadata(KEY, child)).toBeUndefined();
        expect(hasOwnMetadata(KEY, child)).toBe(false);
    });
});
