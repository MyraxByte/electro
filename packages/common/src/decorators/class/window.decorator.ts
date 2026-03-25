import { WINDOW_METADATA } from "../../metadata";
import type { WindowMetadata, WindowOptions } from "../../types";
import { freezeObject } from "../../utils";
import { WindowOptionsValidator } from "../../validation";
import { createClassDecorator } from "../helpers/create-class-decorator";

/**
 * Declares a runtime window class.
 *
 * The decorator records a stable window identifier that the runtime can later use
 * for registration, lookup, and orchestration.
 */
export const Window = createClassDecorator<WindowOptions, WindowMetadata>({
    decoratorName: "@Window()",
    metadataKey: WINDOW_METADATA,
    createDefaultOptions: () => ({}),
    validateOptions: (options) => {
        WindowOptionsValidator.validate(options, "@Window()");
    },
    buildMetadata: (target, options) => {
        const validated = WindowOptionsValidator.validate(options, "@Window()");

        return {
            kind: "window",
            id: validated.id ?? target.name,
            configuration: freezeObject(validated.configuration),
        };
    },
});
