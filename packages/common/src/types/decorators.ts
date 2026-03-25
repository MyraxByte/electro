/**

* Options accepted by `@command()`.
 */
export interface CommandOptions {
    /**
     * Optional externally visible command identifier.
     *
     * Defaults to the decorated method name.
     */
    readonly id?: string;
}

/**

* Options accepted by `@query()`.
 */
export interface QueryOptions {
    /**
     * Optional externally visible query identifier.
     *
     * Defaults to the decorated method name.
     */
    readonly id?: string;
}

/**

* Options accepted by `@job()`.
 */
export interface JobOptions {
    readonly id?: string;
    readonly cron?: string;
}

/**

* Options accepted by `@signal()`.
 */
export interface SignalOptions {
    readonly id?: string;
}

/**

* Generic decorator shape used by low-level composition helpers.
 */
export type ElectroDecorator = ClassDecorator & MethodDecorator & PropertyDecorator & ParameterDecorator;

/**

* Decorator shape supported by `SetMetadata()`.
*
* Parameter decorators are intentionally excluded because generic parameter
* metadata storage is not supported by this package.
 */
export type MetadataDecorator = ClassDecorator & MethodDecorator & PropertyDecorator;
