import { JOB_METADATA } from "../../metadata";
import type { JobMethodMetadata, JobOptions } from "../../types";
import { PrimitiveValidator } from "../../validation";
import { createMethodDecorator } from "../helpers/create-method-decorator";

export const job = createMethodDecorator<JobMethodMetadata, JobOptions>({
    decoratorName: "@job()",
    metadataKey: JOB_METADATA,
    createDefaultOptions: () => ({}),
    validateOptions: (options) => {
        if (options.id !== undefined) {
            PrimitiveValidator.ensureNonEmptyString(options.id, "@job()", "id");
        }

        if (options.cron !== undefined) {
            PrimitiveValidator.ensureNonEmptyString(options.cron, "@job()", "cron");
        }
    },
    buildMetadata: (methodName, options) => ({
        kind: "job",
        methodName,
        id: options.id?.trim() ?? methodName,
        cron: options.cron?.trim(),
    }),
});
