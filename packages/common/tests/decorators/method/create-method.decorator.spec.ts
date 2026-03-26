import { describe, expect, it } from "vitest";
import { MetadataConflictError } from "../../../src/errors";
import { getCommandMetadata } from "../../../src/metadata";
import { expectElectroError } from "../../../src/utils/expect-electro-error";
import { command } from "../../../src/decorators/method/command.decorator";
import { query } from "../../../src/decorators/method/query.decorator";

describe("createRuntimeMethodDecorator()", () => {
    it("rejects duplicate ElectroJS runtime roles", () => {
        const act = () => {
            class Service {
                @command()
                @query()
                public save(): void {}
            }

            return Service;
        };

        expect(act).toThrow(/already has @/i);

        expectElectroError(act, {
            type: MetadataConflictError,
            code: "ELECTRO_METADATA_METHOD_ROLE_CONFLICT",
        });
    });

    it("stores frozen produced metadata", () => {
        class Service {
            @command()
            public save(this: void): void {}
        }

        const metadata = getCommandMetadata(Service.prototype.save)!;

        expect(Object.isFrozen(metadata)).toBe(true);
    });
});
