import type { BaseWindowConstructorOptions } from "electron/main";

/**

* Options accepted by `@Window()`.
 */
export interface WindowOptions {
    /**
     * By default, the window ID is derived from the class name.
     */
    readonly id?: string;
    readonly configuration?: BaseWindowConstructorOptions;
}

/**

* Stored metadata for `@Window()`.
 */
export interface WindowMetadata {
    readonly kind: "window";
    readonly id: string;
    readonly configuration?: BaseWindowConstructorOptions;
}
