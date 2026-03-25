import type { MetadataKey, PropertyKey } from "../types";

type MetadataTarget = object;

/**

* Defines metadata on a class or arbitrary object target.
 */
export function defineMetadata<TValue>(metadataKey: MetadataKey, metadataValue: TValue, target: MetadataTarget): void;
export function defineMetadata<TValue>(metadataKey: MetadataKey, metadataValue: TValue, target: MetadataTarget, propertyKey: PropertyKey): void;
export function defineMetadata<TValue>(metadataKey: MetadataKey, metadataValue: TValue, target: MetadataTarget, propertyKey?: PropertyKey): void {
    if (propertyKey === undefined) {
        Reflect.defineMetadata(metadataKey, metadataValue, target);
        return;
    }

    Reflect.defineMetadata(metadataKey, metadataValue, target, propertyKey);
}

/**

* Reads metadata from a target or its prototype chain.
 */
export function getMetadata<TValue>(metadataKey: MetadataKey, target: MetadataTarget): TValue | undefined;
export function getMetadata<TValue>(metadataKey: MetadataKey, target: MetadataTarget, propertyKey: PropertyKey): TValue | undefined;
export function getMetadata<TValue>(metadataKey: MetadataKey, target: MetadataTarget, propertyKey?: PropertyKey): TValue | undefined {
    if (propertyKey === undefined) {
        return Reflect.getMetadata(metadataKey, target) as TValue | undefined;
    }

    return Reflect.getMetadata(metadataKey, target, propertyKey) as TValue | undefined;
}

/**

* Reads metadata defined directly on a target.
 */
export function getOwnMetadata<TValue>(metadataKey: MetadataKey, target: MetadataTarget): TValue | undefined;
export function getOwnMetadata<TValue>(metadataKey: MetadataKey, target: MetadataTarget, propertyKey: PropertyKey): TValue | undefined;
export function getOwnMetadata<TValue>(metadataKey: MetadataKey, target: MetadataTarget, propertyKey?: PropertyKey): TValue | undefined {
    if (propertyKey === undefined) {
        return Reflect.getOwnMetadata(metadataKey, target) as TValue | undefined;
    }

    return Reflect.getOwnMetadata(metadataKey, target, propertyKey) as TValue | undefined;
}

/**

* Checks whether metadata is defined directly on a target.
 */
export function hasOwnMetadata(metadataKey: MetadataKey, target: MetadataTarget): boolean;
export function hasOwnMetadata(metadataKey: MetadataKey, target: MetadataTarget, propertyKey: PropertyKey): boolean;
export function hasOwnMetadata(metadataKey: MetadataKey, target: MetadataTarget, propertyKey?: PropertyKey): boolean {
    if (propertyKey === undefined) {
        return Reflect.hasOwnMetadata(metadataKey, target);
    }

    return Reflect.hasOwnMetadata(metadataKey, target, propertyKey);
}
