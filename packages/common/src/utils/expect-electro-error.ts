import { expect } from "vitest";
import { ElectroError } from "../errors";

type ElectroErrorClass = {
    readonly prototype: ElectroError;
};

export function expectElectroError(
    fn: () => unknown,
    expected: {
        readonly type: ElectroErrorClass;
        readonly code: string;
        readonly context?: Readonly<Record<string, unknown>>;
    },
): void {
    try {
        fn();
        throw new Error("Expected function to throw an ElectroError.");
    } catch (error) {
        expect(error).toBeInstanceOf(ElectroError);
        expect(error).toBeInstanceOf(expected.type);

        const electroError = error as ElectroError;

        expect(electroError.code).toBe(expected.code);

        if (expected.context !== undefined) {
            expect(electroError.context).toMatchObject(expected.context);
        }
    }
}
