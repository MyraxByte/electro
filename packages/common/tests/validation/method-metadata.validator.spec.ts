import { describe, expect, it } from "vitest";
import { MetadataConflictError } from "../../src/errors";
import { defineMetadata } from "../../src/metadata";
import { COMMAND_METADATA } from "../../src/metadata/keys";
import { expectElectroError } from "../../src/utils/expect-electro-error";
import { MethodMetadataValidator } from "../../src/validation/method-metadata.validator";

describe("MethodMetadataValidator", () => {
    it("accepts method without Electro metadata", () => {
        const handler = function handler(): void {};

        expect(() => MethodMetadataValidator.ensureRoleIsAvailable(handler, "@query()")).not.toThrow();
    });

    it("rejects duplicate method role", () => {
        const handler = function save(): void {};

        defineMetadata(
            COMMAND_METADATA,
            {
                kind: "command",
                methodName: "save",
                id: "save",
            },
            handler,
        );

        const act = () => MethodMetadataValidator.ensureRoleIsAvailable(handler, "@query()");

        expect(act).toThrow(/already has @command/i);

        expectElectroError(act, {
            type: MetadataConflictError,
            code: "ELECTRO_METADATA_METHOD_ROLE_CONFLICT",
            context: {
                decorator: "@query()",
                methodName: "save",
                existingKind: "command",
            },
        });
    });
});
