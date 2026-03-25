import { Ref } from "../di/ref";

export class ResolvableValidator {
    public static matches<TValue>(value: unknown, predicate: (resolvedValue: unknown) => resolvedValue is TValue): boolean {
        if (predicate(value)) {
            return true;
        }

        if (!Ref.isRef(value)) {
            return false;
        }

        try {
            return predicate(Ref.resolve(value));
        } catch {
            return false;
        }
    }
}
