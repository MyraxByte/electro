import { defineMetadata } from "../../metadata";
import type { MetadataKey } from "../../types";
import { DecoratorTargetValidator } from "../../validation";

interface ClassDecoratorDefinition<TOptions, TMetadata extends object> {
    readonly decoratorName: string;
    readonly metadataKey: MetadataKey;
    readonly validateOptions: (options: TOptions) => void;
    readonly buildMetadata: (target: Function, options: TOptions) => TMetadata;
}

interface OptionalOptionsClassDecoratorDefinition<TOptions, TMetadata extends object> extends ClassDecoratorDefinition<TOptions, TMetadata> {
    readonly createDefaultOptions: () => TOptions;
}

interface RequiredOptionsClassDecoratorDefinition<TOptions, TMetadata extends object> extends ClassDecoratorDefinition<TOptions, TMetadata> {
    readonly createDefaultOptions?: never;
}

function hasDefaultOptionsFactory<TOptions, TMetadata extends object>(
    definition: OptionalOptionsClassDecoratorDefinition<TOptions, TMetadata> | RequiredOptionsClassDecoratorDefinition<TOptions, TMetadata>,
): definition is OptionalOptionsClassDecoratorDefinition<TOptions, TMetadata> {
    return "createDefaultOptions" in definition;
}

export function createClassDecorator<TOptions, TMetadata extends object>(
    definition: OptionalOptionsClassDecoratorDefinition<TOptions, TMetadata>,
): (options?: TOptions) => ClassDecorator;

export function createClassDecorator<TOptions, TMetadata extends object>(
    definition: RequiredOptionsClassDecoratorDefinition<TOptions, TMetadata>,
): (options: TOptions) => ClassDecorator;

export function createClassDecorator<TOptions, TMetadata extends object>(
    definition: OptionalOptionsClassDecoratorDefinition<TOptions, TMetadata> | RequiredOptionsClassDecoratorDefinition<TOptions, TMetadata>,
) {
    return (options?: TOptions): ClassDecorator => {
        const resolvedOptions = hasDefaultOptionsFactory(definition) ? (options ?? definition.createDefaultOptions()) : (options as TOptions);

        definition.validateOptions(resolvedOptions);

        return (target: Function): void => {
            DecoratorTargetValidator.ensureClass(target, definition.decoratorName);

            const metadata = Object.freeze(definition.buildMetadata(target, resolvedOptions));
            defineMetadata(definition.metadataKey, metadata, target);
        };
    };
}
