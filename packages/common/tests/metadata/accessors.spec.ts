import { describe, expect, it } from "vitest";
import { command, query } from "../../src/decorators";
import { getMethodsMetadataByClass } from "../../src/metadata/accessors";

describe("getMethodsMetadataByClass()", () => {
    it("collects decorated methods from current class", () => {
        class Service {
            @command()
            public save(): void {}

            @query()
            public getMe(): void {}
        }

        const metadata = getMethodsMetadataByClass(Service);

        expect(metadata).toHaveLength(2);
        expect(metadata.map((item) => item.methodName).sort()).toEqual(["getMe", "save"]);
    });

    it("includes inherited decorated methods", () => {
        class BaseService {
            @query()
            public getBase(): void {}
        }

        class ChildService extends BaseService {
            @command()
            public save(): void {}
        }

        const metadata = getMethodsMetadataByClass(ChildService);

        expect(metadata.map((item) => item.methodName).sort()).toEqual(["getBase", "save"]);
    });

    it("derived override without decorator shadows base decorated method", () => {
        class BaseService {
            @query()
            public getData(): void {}
        }

        class ChildService extends BaseService {
            public override getData(): void {}
        }

        const metadata = getMethodsMetadataByClass(ChildService);

        expect(metadata).toEqual([]);
    });

    it("derived decorated override wins over base decorated method", () => {
        class BaseService {
            @query({ id: "base:getData" })
            public getData(): void {}
        }

        class ChildService extends BaseService {
            @command({ id: "child:getData" })
            public override getData(): void {}
        }

        const metadata = getMethodsMetadataByClass(ChildService);

        expect(metadata).toHaveLength(1);
        expect(metadata[0]).toEqual({
            kind: "command",
            methodName: "getData",
            id: "child:getData",
        });
    });

    it("does not include constructor", () => {
        class Service {
            @command()
            public save(): void {}
        }

        const metadata = getMethodsMetadataByClass(Service);

        expect(metadata.some((item) => item.methodName === "constructor")).toBe(false);
    });

    it("does not include undecorated methods", () => {
        class Service {
            public helper(): void {}

            @query()
            public getMe(): void {}
        }

        const metadata = getMethodsMetadataByClass(Service);

        expect(metadata).toHaveLength(1);
        expect(metadata[0]?.methodName).toBe("getMe");
    });

    it("returns frozen result", () => {
        class Service {
            @command()
            public save(): void {}
        }

        const metadata = getMethodsMetadataByClass(Service);

        expect(Object.isFrozen(metadata)).toBe(true);
        expect(() => {
            (metadata as unknown[]).push("x");
        }).toThrow();
    });
});
