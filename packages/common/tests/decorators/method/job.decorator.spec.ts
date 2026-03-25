import { describe, expect, it } from "vitest";
import { job } from "../../../src/decorators/method/job.decorator";
import { DecoratorConfigurationError } from "../../../src/errors";
import { getJobMetadata } from "../../../src/metadata";
import { expectElectroError } from "../../../src/utils/expect-electro-error";

describe("@job()", () => {
    it("stores metadata", () => {
        class Service {
            @job({ id: "sync:users", cron: "0 * * * *" })
            public syncUsers(this: void): void {}
        }

        expect(getJobMetadata(Service.prototype.syncUsers)).toEqual({
            kind: "job",
            methodName: "syncUsers",
            id: "sync:users",
            cron: "0 * * * *",
        });
    });

    it("uses method name as default id when not provided", () => {
        class Service {
            @job()
            public run(this: void): void {}
        }

        expect(getJobMetadata(Service.prototype.run)).toEqual({
            kind: "job",
            methodName: "run",
            id: "run",
            cron: undefined,
        });
    });

    it("rejects empty id", () => {
        const act = () => job({ id: " " } as never);

        expect(act).toThrow(/must be a non-empty string/i);

        expectElectroError(act, {
            type: DecoratorConfigurationError,
            code: "ELECTRO_DECORATOR_INVALID_OPTION",
            context: {
                decorator: "@job()",
                option: "id",
            },
        });
    });

    it("rejects empty cron", () => {
        const act = () => job({ id: "sync:users", cron: " " } as never);

        expect(act).toThrow(/must be a non-empty string/i);

        expectElectroError(act, {
            type: DecoratorConfigurationError,
            code: "ELECTRO_DECORATOR_INVALID_OPTION",
            context: {
                decorator: "@job()",
                option: "cron",
            },
        });
    });

    it("stores frozen metadata", () => {
        class Service {
            @job({ id: "sync:users" })
            public syncUsers(this: void): void {}
        }

        const metadata = getJobMetadata(Service.prototype.syncUsers)!;

        expect(Object.isFrozen(metadata)).toBe(true);
    });
});
