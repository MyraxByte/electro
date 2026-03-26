import type {
    CommandMethodMetadata,
    InjectableMetadata,
    JobMethodMetadata,
    MetadataKey,
    MethodMetadata,
    ModuleMetadata,
    QueryMethodMetadata,
    SignalMethodMetadata,
    TargetType,
    ViewMetadata,
    WindowMetadata,
} from "../types";
import { getOwnMetadata } from "./helpers";
import { COMMAND_METADATA, INJECTABLE_METADATA, JOB_METADATA, MODULE_METADATA, QUERY_METADATA, SIGNAL_METADATA, VIEW_METADATA, WINDOW_METADATA } from "./keys";

function readOwnMetadata<TValue>(metadataKey: MetadataKey, target: object): TValue | undefined {
    return getOwnMetadata<TValue>(metadataKey, target);
}

/**

* Reads `@Module()` metadata declared directly on a class.
 */
export function getModuleMetadata(target: TargetType): ModuleMetadata | undefined {
    return readOwnMetadata<ModuleMetadata>(MODULE_METADATA, target);
}

/**

* Reads `@Injectable()` metadata declared directly on a class.
 */
export function getInjectableMetadata(target: TargetType): InjectableMetadata | undefined {
    return readOwnMetadata<InjectableMetadata>(INJECTABLE_METADATA, target);
}

/**

* Reads `@Window()` metadata declared directly on a class.
 */
export function getWindowMetadata(target: TargetType): WindowMetadata | undefined {
    return readOwnMetadata<WindowMetadata>(WINDOW_METADATA, target);
}

/**

* Reads `@View()` metadata declared directly on a class.
 */
export function getViewMetadata(target: TargetType): ViewMetadata | undefined {
    return readOwnMetadata<ViewMetadata>(VIEW_METADATA, target);
}

/**

* Reads `@command()` metadata declared on a method handler function.
 */
export function getCommandMetadata(target: object): CommandMethodMetadata | undefined {
    return readOwnMetadata<CommandMethodMetadata>(COMMAND_METADATA, target);
}

/**

* Reads `@query()` metadata declared on a method handler function.
 */
export function getQueryMetadata(target: object): QueryMethodMetadata | undefined {
    return readOwnMetadata<QueryMethodMetadata>(QUERY_METADATA, target);
}

/**

* Reads `@job()` metadata declared on a method handler function.
 */
export function getJobMetadata(target: object): JobMethodMetadata | undefined {
    return readOwnMetadata<JobMethodMetadata>(JOB_METADATA, target);
}

/**

* Reads `@signal()` metadata declared on a method handler function.
 */
export function getSignalMetadata(target: object): SignalMethodMetadata | undefined {
    return readOwnMetadata<SignalMethodMetadata>(SIGNAL_METADATA, target);
}

/**

* Reads the first ElectroJS method metadata found on a handler function.
 */
export function getMethodMetadata(target: object): MethodMetadata | undefined {
    return getCommandMetadata(target) ?? getQueryMetadata(target) ?? getJobMetadata(target) ?? getSignalMetadata(target);
}

/**

* Get all Electro-decorated methods visible on a class, including inherited methods.
*
* Override semantics are strict:
* a method name declared on the derived class always shadows the base declaration,
* even if the derived declaration is not decorated.
 */
export function getMethodsMetadataByClass(target: TargetType): readonly MethodMetadata[] {
    const collected: MethodMetadata[] = [];
    const shadowedMethodNames = new Set<string>();

    let prototype = target.prototype as object | null;

    while (prototype && prototype !== Object.prototype) {
        for (const propertyKey of Reflect.ownKeys(prototype)) {
            if (typeof propertyKey !== "string" || propertyKey === "constructor") {
                continue;
            }

            if (shadowedMethodNames.has(propertyKey)) {
                continue;
            }

            shadowedMethodNames.add(propertyKey);

            const descriptor = Object.getOwnPropertyDescriptor(prototype, propertyKey);

            if (!descriptor || typeof descriptor.value !== "function") {
                continue;
            }

            const metadata = getMethodMetadata(descriptor.value);

            if (metadata) {
                collected.push(metadata);
            }
        }

        prototype = Object.getPrototypeOf(prototype);
    }

    return Object.freeze(collected);
}
