import { MetadataConflictError } from "../errors";
import { getMethodMetadata } from "../metadata";

export class MethodMetadataValidator {
    public static ensureRoleIsAvailable(handler: object, decorator: string): void {
        const metadata = getMethodMetadata(handler);

        if (!metadata) {
            return;
        }

        throw MetadataConflictError.duplicateMethodRole(decorator, metadata.methodName, metadata.kind);
    }
}
