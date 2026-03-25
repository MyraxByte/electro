/**

* Returns a frozen shallow clone of an object.
*
* Plain-object validation is the responsibility of callers that need it.
 */
export function freezeObject<TValue extends object>(value: TValue | undefined): Readonly<TValue> | undefined {
    if (value === undefined) {
        return undefined;
    }

    return Object.freeze({ ...value });
}
