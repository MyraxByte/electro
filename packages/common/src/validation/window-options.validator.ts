import type { WindowOptions } from "../types";
import { ObjectValidator } from "./object.validator";
import { PrimitiveValidator } from "./primitive.validator";

export interface ValidatedWindowOptions {
    readonly id?: string;
    readonly configuration?: WindowOptions["configuration"];
}

export class WindowOptionsValidator {
    public static validate(options: WindowOptions, decorator: string): ValidatedWindowOptions {
        if (options.id !== undefined) {
            PrimitiveValidator.ensureNonEmptyString(options.id, decorator, "id");
        }

        ObjectValidator.ensurePlainObject(options.configuration, decorator, "configuration");

        return Object.freeze({
            id: options.id?.trim(),
            configuration: options.configuration,
        });
    }
}
