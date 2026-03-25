/**

* Returns a frozen shallow copy of an array-like input.
 */
export function freezeArray<TValue>(values: readonly TValue[] | undefined): readonly TValue[] {
    if (values === undefined) {
        return Object.freeze([]);
    }

    return Object.freeze([...values]);
}
