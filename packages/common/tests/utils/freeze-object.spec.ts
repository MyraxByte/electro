import { describe, expect, it } from "vitest";
import { freezeObject } from "../../src/utils/freeze-object";

describe("freezeObject()", () => {
    it("returns undefined for undefined input", () => {
        expect(freezeObject(undefined)).toBeUndefined();
    });

    it("returns frozen shallow clone", () => {
        const source = { a: 1 };
        const result = freezeObject(source);

        expect(result).toEqual({ a: 1 });
        expect(result).not.toBe(source);
        expect(Object.isFrozen(result)).toBe(true);
    });

    it("does not mutate source object reference", () => {
        const source = { a: 1 };
        const result = freezeObject(source)!;

        source.a = 2;

        expect(result).toEqual({ a: 1 });
        expect(source).toEqual({ a: 2 });
    });
});
