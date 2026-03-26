import type { ProviderScope } from "./di";

/**

* Stored metadata for `@Injectable()`.
 */
export interface InjectableMetadata {
    readonly kind: "injectable";
    readonly scope: ProviderScope;
}

/**

* Shared shape for ElectroJS method metadata.
 */
interface BaseMethodMetadata {
    readonly methodName: string;
    readonly id: string;
}

/**

* Stored metadata for `@command()`.
 */
export interface CommandMethodMetadata extends BaseMethodMetadata {
    readonly kind: "command";
}

/**

* Stored metadata for `@query()`.
 */
export interface QueryMethodMetadata extends BaseMethodMetadata {
    readonly kind: "query";
}

/**

* Stored metadata for `@job()`.
 */
export interface JobMethodMetadata extends BaseMethodMetadata {
    readonly kind: "job";
    readonly cron?: string;
}

/**

* Stored metadata for `@signal()`.
 */
export interface SignalMethodMetadata extends BaseMethodMetadata {
    readonly kind: "signal";
}

/**

* Union of all ElectroJS runtime method metadata kinds.
 */
export type MethodMetadata = CommandMethodMetadata | QueryMethodMetadata | JobMethodMetadata | SignalMethodMetadata;
