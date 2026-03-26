import { INJECTABLE_METADATA } from "../../metadata";
import type { InjectableMetadata, InjectableOptions } from "../../types";
import { ScopeValidator } from "../../validation";
import { createClassDecorator } from "../helpers/create-class-decorator";

/**
 * Marks a class as an ElectroJS provider that can be managed by the runtime container.
 *
 * The decorator stores only descriptive metadata.
 * Provider creation and lifecycle semantics are implemented by the runtime package.
 */
export const Injectable = createClassDecorator<InjectableOptions, InjectableMetadata>({
    decoratorName: "@Injectable()",
    metadataKey: INJECTABLE_METADATA,
    createDefaultOptions: () => ({}),
    validateOptions: (options) => {
        ScopeValidator.ensureProviderScope(options.scope, "@Injectable()", "scope");
    },
    buildMetadata: (_target, options) => ({
        kind: "injectable",
        scope: options.scope ?? "singleton",
    }),
});
