import type { Constructor } from "../types";

/**

* Checks whether a value can be used as a constructor with `new`.
*
* This intentionally validates runtime constructability rather than trying to
* distinguish between native `class` syntax and other constructable functions.
* That makes the check robust across transpilation and bundling.
 */
export function isConstructable<TValue = object>(value: unknown): value is Constructor<TValue> {
    if (typeof value !== "function") {
        return false;
    }

    try {
        Reflect.construct(String, [], value as new () => unknown);
        return true;
    } catch {
        return false;
    }
}
