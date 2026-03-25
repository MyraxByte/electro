import type { WebContents, WebPreferences } from "electron";
import { DecoratorConfigurationError } from "../errors";
import type { ViewOptions } from "../types";
import { ObjectValidator } from "./object.validator";
import { PrimitiveValidator } from "./primitive.validator";

function normalizeDistinctStringArray(values: readonly string[] | undefined, decorator: string, option: string): readonly string[] {
    if (values === undefined) {
        return Object.freeze([]);
    }

    if (!Array.isArray(values)) {
        throw DecoratorConfigurationError.invalidStringArray(decorator, option, values);
    }

    const normalized: string[] = [];
    const seen = new Set<string>();

    for (const value of values) {
        if (typeof value !== "string" || value.trim().length === 0) {
            throw DecoratorConfigurationError.invalidStringArray(decorator, option, values);
        }

        const trimmed = value.trim();

        if (seen.has(trimmed)) {
            throw DecoratorConfigurationError.duplicateStringArrayValue(decorator, option, trimmed);
        }

        seen.add(trimmed);
        normalized.push(trimmed);
    }

    return Object.freeze(normalized);
}

function isBundledViewSource(source: string): boolean {
    return source.startsWith("view:");
}

function isExternalViewSource(source: string): boolean {
    return source.startsWith("file:") || source.startsWith("http://") || source.startsWith("https://");
}

function deriveBundledViewId(source: string, decorator: string): string {
    const id = source.slice("view:".length).trim();

    if (id.length === 0) {
        throw DecoratorConfigurationError.invalidViewSource(decorator, source);
    }

    return id;
}

export interface ValidatedViewOptions {
    readonly id: string;
    readonly source: string;
    readonly access: readonly string[];
    readonly signals: readonly string[];
    readonly configuration?: {
        readonly webContents?: WebContents;
        readonly webPreferences?: WebPreferences;
    };
}

export class ViewOptionsValidator {
    public static validate(options: ViewOptions, decorator: string): ValidatedViewOptions {
        PrimitiveValidator.ensureNonEmptyString(options?.source, decorator, "source");

        const source = options.source.trim();

        if (!isBundledViewSource(source) && !isExternalViewSource(source)) {
            throw DecoratorConfigurationError.invalidViewSource(decorator, source);
        }

        let id: string;

        if (isBundledViewSource(source)) {
            if ("id" in options && options.id !== undefined) {
                throw DecoratorConfigurationError.bundledViewMustNotDeclareId(decorator, source);
            }

            id = deriveBundledViewId(source, decorator);
        } else {
            if (typeof options.id !== "string" || options.id.trim().length === 0) {
                throw DecoratorConfigurationError.externalViewRequiresId(decorator, source);
            }

            id = options.id.trim();
        }

        const access = normalizeDistinctStringArray(options.access, decorator, "access");
        const signals = normalizeDistinctStringArray(options.signals, decorator, "signals");

        if (options.configuration !== undefined) {
            ObjectValidator.ensurePlainObject(options.configuration, decorator, "configuration");
            ObjectValidator.ensurePlainObject(options.configuration.webPreferences, decorator, "webPreferences");
        }

        return Object.freeze({
            id,
            source,
            access,
            signals,
            configuration: options.configuration,
        });
    }
}
