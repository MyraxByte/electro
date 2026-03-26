import { MODULE_METADATA } from "../../metadata";
import type { ModuleMetadata, ModuleOptions } from "../../types";
import { freezeArray } from "../../utils/freeze-array";
import { ModuleOptionsValidator } from "../../validation";
import { createClassDecorator } from "../helpers/create-class-decorator";

/**
 * Declares an ElectroJS module.
 *
 * A module describes:
 * - imported modules
 * - declared providers
 * - exported public surface
 *
 * It does not instantiate anything by itself.
 */
export const Module = createClassDecorator<ModuleOptions, ModuleMetadata>({
    decoratorName: "@Module()",
    metadataKey: MODULE_METADATA,
    createDefaultOptions: () => ({}),
    validateOptions: (options) => {
        ModuleOptionsValidator.validate(options, "@Module()");
    },
    buildMetadata: (_target, options) => ({
        kind: "module",
        id: options.id?.trim(),
        imports: freezeArray(options.imports),
        providers: freezeArray(options.providers),
        views: freezeArray(options.views),
        windows: freezeArray(options.windows),
        exports: freezeArray(options.exports),
    }),
});
