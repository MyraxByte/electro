import { COMMAND_METADATA } from "../../metadata";
import type { CommandMethodMetadata, CommandOptions } from "../../types";
import { PrimitiveValidator } from "../../validation";
import { createMethodDecorator } from "../helpers/create-method-decorator";

export const command = createMethodDecorator<CommandMethodMetadata, CommandOptions>({
    decoratorName: "@command()",
    metadataKey: COMMAND_METADATA,
    createDefaultOptions: () => ({}),
    validateOptions: (options) => {
        if (options.id !== undefined) {
            PrimitiveValidator.ensureNonEmptyString(options.id, "@command()", "id");
        }
    },
    buildMetadata: (methodName, options) => {
        return {
            kind: "command",
            methodName,
            id: options.id?.trim() ?? methodName,
        };
    },
});
