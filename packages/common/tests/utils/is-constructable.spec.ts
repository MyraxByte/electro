import { describe, expect, it } from "vitest";
import { isConstructable } from "../../src/utils/is-constructable";

describe("isConstructable()", () => {
    it("accepts class declaration", () => {
        class Service {}

        expect(isConstructable(Service)).toBe(true);
    });

    it("accepts anonymous class expression", () => {
        const Service = class {};

        expect(isConstructable(Service)).toBe(true);
    });

    it("accepts constructable function", () => {
        function Service(this: object): void {}

        expect(isConstructable(Service)).toBe(true);
    });

    it("rejects arrow function", () => {
        const service = (): void => {};

        expect(isConstructable(service)).toBe(false);
    });

    it("rejects plain object", () => {
        expect(isConstructable({})).toBe(false);
    });

    it("rejects null", () => {
        expect(isConstructable(null)).toBe(false);
    });
});
