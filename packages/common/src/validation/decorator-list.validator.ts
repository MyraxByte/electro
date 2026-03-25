import { DecoratorConfigurationError } from "../errors";
import type { ElectroDecorator } from "../types";

export class DecoratorListValidator {
    public static validate(decorators: readonly unknown[], decoratorName: string): asserts decorators is readonly ElectroDecorator[] {
        for (const [index, decorator] of decorators.entries()) {
            if (typeof decorator !== "function") {
                throw DecoratorConfigurationError.invalidDecoratorList(decoratorName, decorator, index);
            }
        }
    }
}
