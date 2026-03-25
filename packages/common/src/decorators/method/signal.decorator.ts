import { SIGNAL_METADATA } from "../../metadata";
import type { SignalMethodMetadata, SignalOptions } from "../../types";
import { PrimitiveValidator } from "../../validation";
import { createMethodDecorator } from "../helpers/create-method-decorator";

export const signal = createMethodDecorator<SignalMethodMetadata, SignalOptions>({
    decoratorName: "@signal()",
    metadataKey: SIGNAL_METADATA,
    createDefaultOptions: () => ({}),
    validateOptions: (options) => {
        if (options.id !== undefined) {
            PrimitiveValidator.ensureNonEmptyString(options.id, "@signal()", "id");
        }
    },
    buildMetadata: (methodName, options) => ({
        kind: "signal",
        methodName,
        id: options.id?.trim() ?? methodName,
    }),
});
