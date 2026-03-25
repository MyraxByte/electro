import { defineMetadata } from "../../metadata";
import type { MetadataKey, MethodMetadata } from "../../types";
import { DecoratorTargetValidator, MethodMetadataValidator } from "../../validation";

interface MethodDecoratorDefinition<TMetadata extends MethodMetadata, TOptions> {
    readonly decoratorName: string;
    readonly metadataKey: MetadataKey;
    readonly validateOptions: (options: TOptions) => void;
    readonly buildMetadata: (methodName: string, options: TOptions) => TMetadata;
}

interface OptionalOptionsMethodDecoratorDefinition<TMetadata extends MethodMetadata, TOptions> extends MethodDecoratorDefinition<TMetadata, TOptions> {
    readonly createDefaultOptions: () => TOptions;
}

interface RequiredOptionsMethodDecoratorDefinition<TMetadata extends MethodMetadata, TOptions> extends MethodDecoratorDefinition<TMetadata, TOptions> {
    readonly createDefaultOptions?: never;
}

function hasDefaultOptionsFactory<TMetadata extends MethodMetadata, TOptions>(
    definition: OptionalOptionsMethodDecoratorDefinition<TMetadata, TOptions> | RequiredOptionsMethodDecoratorDefinition<TMetadata, TOptions>,
): definition is OptionalOptionsMethodDecoratorDefinition<TMetadata, TOptions> {
    return "createDefaultOptions" in definition;
}

export function createMethodDecorator<TMetadata extends MethodMetadata, TOptions>(
    definition: OptionalOptionsMethodDecoratorDefinition<TMetadata, TOptions>,
): (options?: TOptions) => MethodDecorator;

export function createMethodDecorator<TMetadata extends MethodMetadata, TOptions>(
    definition: RequiredOptionsMethodDecoratorDefinition<TMetadata, TOptions>,
): (options: TOptions) => MethodDecorator;

export function createMethodDecorator<TMetadata extends MethodMetadata, TOptions>(
    definition: OptionalOptionsMethodDecoratorDefinition<TMetadata, TOptions> | RequiredOptionsMethodDecoratorDefinition<TMetadata, TOptions>,
) {
    return (options?: TOptions): MethodDecorator => {
        const resolvedOptions = hasDefaultOptionsFactory(definition) ? (options ?? definition.createDefaultOptions()) : (options as TOptions);

        definition.validateOptions(resolvedOptions);

        return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor): void => {
            DecoratorTargetValidator.ensureInstanceMethod(target, propertyKey, descriptor, definition.decoratorName);
            MethodMetadataValidator.ensureRoleIsAvailable(descriptor.value as object, definition.decoratorName);

            const metadata = Object.freeze(definition.buildMetadata(propertyKey, resolvedOptions));
            defineMetadata(definition.metadataKey, metadata, descriptor.value as object);
        };
    };
}
