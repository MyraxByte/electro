import { ElectroError } from "./electro.error";

export class MetadataError extends ElectroError {}

export class MetadataConflictError extends MetadataError {
    public static duplicateMethodRole(decorator: string, methodName: string, existingKind: string): MetadataConflictError {
        return new MetadataConflictError(
            `${decorator} cannot be applied because method "${methodName}" already has @${existingKind}().`,
            "ELECTRO_METADATA_METHOD_ROLE_CONFLICT",
            {
                decorator,
                methodName,
                existingKind,
            },
        );
    }
}
