import { describe, expect, it } from "vitest";
import { freezeArray } from "../../src/utils/freeze-array";

describe("freezeArray()", () => {
    it("returns frozen empty array for undefined", () => {
        const result = freezeArray(undefined);

        expect(result).toEqual([]);
        expect(Object.isFrozen(result)).toBe(true);
    });

    it("returns frozen shallow copy", () => {
        const source = [1, 2, 3];
        const result = freezeArray(source);

        expect(result).toEqual([1, 2, 3]);
        expect(result).not.toBe(source);
        expect(Object.isFrozen(result)).toBe(true);
    });

    it("does not mutate source array", () => {
        const source = [1, 2, 3];
        const result = freezeArray(source);

        source.push(4);

        expect(result).toEqual([1, 2, 3]);
        expect(source).toEqual([1, 2, 3, 4]);
    });
});
