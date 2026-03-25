import { DecoratorTargetError } from "../errors";
import { isConstructable } from "../utils/is-constructable";

export class DecoratorTargetValidator {
    public static ensureClass(target: unknown, decorator: string): asserts target is Function {
        if (!isConstructable(target)) {
            throw DecoratorTargetError.classOnly(decorator, target);
        }
    }

    public static ensureInstanceMethod(
        target: unknown,
        propertyKey: unknown,
        descriptor: PropertyDescriptor | undefined,
        decorator: string,
    ): asserts propertyKey is string {
        if (isConstructable(target)) {
            throw DecoratorTargetError.staticMethodForbidden(decorator, propertyKey);
        }

        if (typeof propertyKey !== "string" || propertyKey.trim().length === 0) {
            throw DecoratorTargetError.instanceMethodOnly(decorator, propertyKey);
        }

        if (!descriptor || typeof descriptor.value !== "function") {
            throw DecoratorTargetError.instanceMethodOnly(decorator, propertyKey);
        }
    }
}
