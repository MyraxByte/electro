import { DecoratorTargetError } from "../../errors";
import { defineMetadata } from "../../metadata/helpers";
import type { MetadataDecorator, MetadataKey } from "../../types";

/**
 * Attaches custom metadata to a class, method, or property target.
 *
 * For method decorators, metadata is stored on the method handler function itself.
 * This keeps runtime scanning predictable and avoids ambiguities around prototype lookups.
 *
 * Parameter decorators are intentionally not supported here because generic metadata
 * storage for parameters is ambiguous without a dedicated parameter metadata model.
 */
export function SetMetadata<TKey extends MetadataKey, TValue>(metadataKey: TKey, metadataValue: TValue): MetadataDecorator {
    return (target: object | Function, propertyKey?: string | symbol, descriptorOrIndex?: PropertyDescriptor | number): void => {
        if (typeof descriptorOrIndex === "number") {
            throw DecoratorTargetError.parameterDecoratorsUnsupported("@SetMetadata()");
        }

        if (descriptorOrIndex !== undefined && typeof descriptorOrIndex.value === "function") {
            defineMetadata(metadataKey, metadataValue, descriptorOrIndex.value as object);
            return;
        }

        if (propertyKey !== undefined) {
            defineMetadata(metadataKey, metadataValue, target, propertyKey);
            return;
        }

        defineMetadata(metadataKey, metadataValue, target);
    };
}
