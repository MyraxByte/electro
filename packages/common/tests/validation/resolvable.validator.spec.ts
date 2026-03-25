import { describe, expect, it } from "vitest";
import { Ref } from "../../src/di/ref";
import { ResolvableValidator } from "../../src/validation/resolvable.validator";

describe("ResolvableValidator", () => {
    it("matches direct value with predicate", () => {
        const result = ResolvableValidator.matches("hello", (value): value is string => typeof value === "string");

        expect(result).toBe(true);
    });

    it("matches Ref.create resolved value with predicate", () => {
        const result = ResolvableValidator.matches(
            Ref.create(() => "hello"),
            (value): value is string => typeof value === "string",
        );

        expect(result).toBe(true);
    });

    it("rejects direct value when predicate fails", () => {
        const result = ResolvableValidator.matches(123, (value): value is string => typeof value === "string");

        expect(result).toBe(false);
    });

    it("rejects non-ref unresolved object when predicate fails", () => {
        const result = ResolvableValidator.matches({ ref: () => "hello" }, (value): value is string => typeof value === "string");

        expect(result).toBe(false);
    });

    it("rejects Ref.create when resolved value does not match predicate", () => {
        const result = ResolvableValidator.matches(
            Ref.create(() => 123),
            (value): value is string => typeof value === "string",
        );

        expect(result).toBe(false);
    });

    it("rejects Ref.create when factory throws", () => {
        const result = ResolvableValidator.matches(
            Ref.create(() => {
                throw new Error("boom");
            }),
            (value): value is string => typeof value === "string",
        );

        expect(result).toBe(false);
    });
});
