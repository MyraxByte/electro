import { VIEW_METADATA } from "../../metadata";
import type { ViewMetadata, ViewOptions } from "../../types";
import { freezeObject } from "../../utils/freeze-object";
import { ViewOptionsValidator } from "../../validation";
import { createClassDecorator } from "../helpers/create-class-decorator";

/**
 * Declares a runtime view class.
 *
 * Rules:
 * - `source: "view:<id>"`   -> `id` is derived automatically, explicit `id` is forbidden
 * - `source: "file:..."`    -> explicit `id` is required
 * - `source: "http://..."`  -> explicit `id` is required
 * - `source: "https://..."` -> explicit `id` is required
 */
export const View = createClassDecorator<ViewOptions, ViewMetadata>({
    decoratorName: "@View()",
    metadataKey: VIEW_METADATA,
    validateOptions: (options) => {
        ViewOptionsValidator.validate(options, "@View()");
    },
    buildMetadata: (_target, options) => {
        const validated = ViewOptionsValidator.validate(options, "@View()");

        return {
            kind: "view",
            id: validated.id,
            source: validated.source,
            access: validated.access,
            signals: validated.signals,
            configuration: buildViewConfigurationMetadata(validated.configuration),
        };
    },
});

function buildViewConfigurationMetadata(configuration: ViewMetadata["configuration"]): ViewMetadata["configuration"] {
    if (configuration === undefined) {
        return undefined;
    }

    return Object.freeze({
        ...configuration,
        webPreferences: freezeObject(configuration.webPreferences),
    });
}
