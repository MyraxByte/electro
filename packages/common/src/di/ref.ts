import { TokenConfigurationError } from "../errors";
import type { ForwardReference } from "../types";

const REF_BRAND = Symbol("electro:dependency-reference");

export class Ref {
    /**
     * Creates a lazily resolved reference.
     *
     * `Ref.create()` exists to solve declaration-time cycles such as:
     * - module A importing module B while module B also imports module A
     * - provider definitions that need to reference a token declared later
     *
     * It does not, by itself, solve runtime circular instantiation problems.
     */
    public static create<TValue>(factory: () => TValue): ForwardReference<TValue> {
        if (typeof factory !== "function") {
            throw TokenConfigurationError.invalidForwardRefFactory(factory);
        }

        return Object.freeze({
            [REF_BRAND]: true as const,
            ref: factory,
        }) as ForwardReference<TValue>;
    }

    /**
     * Checks whether a value is a branded forward reference.
     */
    public static isRef<TValue>(value: unknown): value is ForwardReference<TValue> {
        if (typeof value !== "object" || value === null) {
            return false;
        }

        return (
            REF_BRAND in value &&
            (value as Record<PropertyKey, unknown>)[REF_BRAND] === true &&
            "ref" in value &&
            typeof (value as { ref?: unknown }).ref === "function"
        );
    }

    /**
     * Resolves an immediate value or a forward reference to its final value.
     */
    public static resolve<TValue>(value: TValue | ForwardReference<TValue>): TValue {
        return Ref.isRef(value) ? value.ref() : value;
    }
}
