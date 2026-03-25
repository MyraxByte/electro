import { DecoratorListValidator } from "../../validation";

export function apply(...decorators: readonly ClassDecorator[]): ClassDecorator;
export function apply(...decorators: readonly MethodDecorator[]): MethodDecorator;
export function apply(...decorators: readonly PropertyDecorator[]): PropertyDecorator;
export function apply(...decorators: readonly ParameterDecorator[]): ParameterDecorator;
export function apply(
    ...decorators: readonly (ClassDecorator | MethodDecorator | PropertyDecorator | ParameterDecorator)[]
): ClassDecorator | MethodDecorator | PropertyDecorator | ParameterDecorator {
    DecoratorListValidator.validate(decorators, "apply()");

    return (target: object | Function, propertyKey?: string | symbol, descriptorOrIndex?: PropertyDescriptor | number): void => {
        for (const decorator of decorators) {
            if (typeof descriptorOrIndex === "number") {
                (decorator as ParameterDecorator)(target, propertyKey as string | symbol | undefined, descriptorOrIndex);
                continue;
            }

            if (propertyKey !== undefined) {
                if (descriptorOrIndex !== undefined) {
                    (decorator as MethodDecorator)(target, propertyKey, descriptorOrIndex);
                    continue;
                }

                (decorator as PropertyDecorator)(target, propertyKey);
                continue;
            }

            (decorator as ClassDecorator)(target as Function);
        }
    };
}
