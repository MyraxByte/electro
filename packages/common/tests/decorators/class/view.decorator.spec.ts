import { describe, expect, it } from "vitest";
import { View } from "../../../src/decorators/class/view.decorator";
import { DecoratorConfigurationError } from "../../../src/errors";
import { getViewMetadata } from "../../../src/metadata";
import { expectElectroError } from "../../../src/utils/expect-electro-error";

describe("@View()", () => {
    it('derives id from "view:*" source', () => {
        @View({
            source: "view:main",
        })
        class MainView {}

        expect(getViewMetadata(MainView)).toEqual({
            kind: "view",
            id: "main",
            source: "view:main",
            access: [],
            signals: [],
            configuration: undefined,
        });
    });

    it('rejects explicit id for "view:*" source', () => {
        const act = () =>
            View({
                id: "main",
                source: "view:main",
            } as never);

        expect(act).toThrow(/must not declare "id"/i);

        expectElectroError(act, {
            type: DecoratorConfigurationError,
            code: "ELECTRO_VIEW_ID_FORBIDDEN_FOR_BUNDLED_RESOURCE",
            context: {
                decorator: "@View()",
                source: "view:main",
            },
        });
    });

    it('requires id for "file:" source', () => {
        const act = () =>
            View({
                source: "file:./index.html",
            } as never);

        expect(act).toThrow(/must declare a non-empty "id"/i);

        expectElectroError(act, {
            type: DecoratorConfigurationError,
            code: "ELECTRO_VIEW_ID_REQUIRED_FOR_EXTERNAL_RESOURCE",
            context: {
                decorator: "@View()",
                source: "file:./index.html",
            },
        });
    });

    it('requires id for "http://" source', () => {
        const act = () =>
            View({
                source: "http://localhost:5173",
            } as never);

        expect(act).toThrow(/must declare a non-empty "id"/i);

        expectElectroError(act, {
            type: DecoratorConfigurationError,
            code: "ELECTRO_VIEW_ID_REQUIRED_FOR_EXTERNAL_RESOURCE",
            context: {
                decorator: "@View()",
                source: "http://localhost:5173",
            },
        });
    });

    it("throws specialized error code for missing external id", () => {
        expectElectroError(
            () =>
                View({
                    source: "file:./index.html",
                } as never),
            {
                type: DecoratorConfigurationError,
                code: "ELECTRO_VIEW_ID_REQUIRED_FOR_EXTERNAL_RESOURCE",
                context: {
                    decorator: "@View()",
                    source: "file:./index.html",
                },
            },
        );
    });

    it("accepts external source with explicit id", () => {
        @View({
            id: "devtools",
            source: "http://localhost:5173",
        })
        class DevtoolsView {}

        expect(getViewMetadata(DevtoolsView)).toEqual({
            kind: "view",
            id: "devtools",
            source: "http://localhost:5173",
            access: [],
            signals: [],
            configuration: undefined,
        });
    });

    it("normalizes trimmed access and signals", () => {
        @View({
            source: "view:main",
            access: [" auth:getMe ", "project:list"],
            signals: [" auth:user-logged-in "],
        })
        class MainView {}

        expect(getViewMetadata(MainView)).toEqual({
            kind: "view",
            id: "main",
            source: "view:main",
            access: ["auth:getMe", "project:list"],
            signals: ["auth:user-logged-in"],
            configuration: undefined,
        });
    });

    it("stores cloned access and signals arrays", () => {
        const access = ["auth:getMe"];
        const signals = ["auth:user-logged-in"];

        @View({
            source: "view:main",
            access,
            signals,
        })
        class MainView {}

        const metadata = getViewMetadata(MainView)!;

        expect(metadata.access).toEqual(["auth:getMe"]);
        expect(metadata.signals).toEqual(["auth:user-logged-in"]);
        expect(metadata.access).not.toBe(access);
        expect(metadata.signals).not.toBe(signals);
    });

    it("rejects duplicate access entries", () => {
        const act = () =>
            View({
                source: "view:main",
                access: ["auth:getMe", " auth:getMe "],
            });

        expect(act).toThrow(/must not contain duplicate value/i);

        expectElectroError(act, {
            type: DecoratorConfigurationError,
            code: "ELECTRO_DECORATOR_DUPLICATE_OPTION_VALUE",
            context: {
                decorator: "@View()",
                option: "access",
                duplicateValue: "auth:getMe",
            },
        });
    });

    it("rejects duplicate signal entries", () => {
        const act = () =>
            View({
                source: "view:main",
                signals: ["auth:user-logged-in", " auth:user-logged-in "],
            });

        expect(act).toThrow(/must not contain duplicate value/i);

        expectElectroError(act, {
            type: DecoratorConfigurationError,
            code: "ELECTRO_DECORATOR_DUPLICATE_OPTION_VALUE",
            context: {
                decorator: "@View()",
                option: "signals",
                duplicateValue: "auth:user-logged-in",
            },
        });
    });

    it("rejects invalid source scheme", () => {
        const act = () =>
            View({
                source: "ftp://example.com/app",
            } as never);

        expect(act).toThrow(/must start with "view:", "file:", "http:\/\/" or "https:\/\//i);

        expectElectroError(act, {
            type: DecoratorConfigurationError,
            code: "ELECTRO_VIEW_INVALID_RESOURCE",
            context: {
                decorator: "@View()",
                source: "ftp://example.com/app",
            },
        });
    });

    it("rejects non-plain configuration object", () => {
        const act = () =>
            View({
                source: "view:main",
                configuration: new Map() as never,
            });

        expect(act).toThrow(/must be a plain object/i);

        expectElectroError(act, {
            type: DecoratorConfigurationError,
            code: "ELECTRO_DECORATOR_INVALID_OPTION",
            context: {
                decorator: "@View()",
                option: "configuration",
            },
        });
    });

    it("rejects non-plain nested webPreferences object", () => {
        const act = () =>
            View({
                source: "view:main",
                configuration: {
                    webPreferences: new Map() as never,
                },
            });

        expect(act).toThrow(/must be a plain object/i);

        expectElectroError(act, {
            type: DecoratorConfigurationError,
            code: "ELECTRO_DECORATOR_INVALID_OPTION",
            context: {
                decorator: "@View()",
                option: "webPreferences",
            },
        });
    });

    it("clones and freezes nested webPreferences", () => {
        const webPreferences = {
            devTools: true,
        };

        @View({
            source: "view:main",
            configuration: {
                webPreferences,
            },
        })
        class MainView {}

        const metadata = getViewMetadata(MainView)!;
        const frozenWebPreferences = metadata.configuration?.webPreferences;

        expect(frozenWebPreferences).toEqual({
            devTools: true,
        });
        expect(frozenWebPreferences).not.toBe(webPreferences);
        expect(Object.isFrozen(frozenWebPreferences)).toBe(true);
    });

    it("stores frozen metadata", () => {
        @View({
            source: "view:main",
            access: ["auth:getMe"],
        })
        class MainView {}

        const metadata = getViewMetadata(MainView)!;

        expect(Object.isFrozen(metadata)).toBe(true);
        expect(Object.isFrozen(metadata.access)).toBe(true);

        expect(() => {
            (metadata.access as string[]).push("x");
        }).toThrow();
    });
});
