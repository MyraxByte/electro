import { describe, expect, it } from "vitest";
import { Window } from "../../../src/decorators/class/window.decorator";
import { DecoratorConfigurationError, DecoratorTargetError } from "../../../src/errors";
import { getWindowMetadata } from "../../../src/metadata";
import { expectElectroError } from "../../../src/utils/expect-electro-error";

describe("@Window()", () => {
    it("stores window metadata", () => {
        @Window({ id: "main" })
        class MainWindow {}

        expect(getWindowMetadata(MainWindow)).toEqual({
            kind: "window",
            id: "main",
        });
    });

    it("rejects empty id", () => {
        const act = () =>
            Window({
                id: "   ",
            } as never);

        expect(act).toThrow(/must be a non-empty string/i);

        expectElectroError(act, {
            type: DecoratorConfigurationError,
            code: "ELECTRO_DECORATOR_INVALID_OPTION",
            context: {
                decorator: "@Window()",
                option: "id",
            },
        });
    });

    it("stores frozen metadata", () => {
        @Window({ id: "main" })
        class MainWindow {}

        const metadata = getWindowMetadata(MainWindow)!;

        expect(Object.isFrozen(metadata)).toBe(true);
    });

    it("rejects non-class target", () => {
        const decorator = Window({ id: "main" });
        const act = () => decorator({} as never);

        expect(act).toThrow(/only be applied to classes/i);

        expectElectroError(act, {
            type: DecoratorTargetError,
            code: "ELECTRO_DECORATOR_INVALID_TARGET",
            context: {
                decorator: "@Window()",
            },
        });
    });
});
