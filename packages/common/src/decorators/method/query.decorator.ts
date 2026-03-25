import { QUERY_METADATA } from "../../metadata";
import type { QueryMethodMetadata, QueryOptions } from "../../types";
import { PrimitiveValidator } from "../../validation";
import { createMethodDecorator } from "../helpers/create-method-decorator";

export const query = createMethodDecorator<QueryMethodMetadata, QueryOptions>({
    decoratorName: "@query()",
    metadataKey: QUERY_METADATA,
    createDefaultOptions: () => ({}),
    validateOptions: (options) => {
        if (options.id !== undefined) {
            PrimitiveValidator.ensureNonEmptyString(options.id, "@query()", "id");
        }
    },
    buildMetadata: (methodName, options) => ({
        kind: "query",
        methodName,
        id: options.id?.trim() ?? methodName,
    }),
});
