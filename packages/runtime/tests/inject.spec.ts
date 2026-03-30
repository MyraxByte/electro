import { describe, expectTypeOf, it } from "vitest";
import type { TypedSignalBus } from "../src/contracts/authoring";
import { inject } from "../src/container/inject";
import { SignalBus } from "../src/signals/bus";

declare module "../src/contracts/authoring" {
    interface ModuleSignalPayloadMap {
        "test:payload": {
            value: number;
        };
    }
}

class ExampleService {}

const resolveSignalBus = () => inject(SignalBus);
const resolveExampleService = () => inject(ExampleService);

function assertPayloadHandlerType(signalBus: TypedSignalBus): void {
    signalBus.subscribe("test:payload", async (payload) => {
        expectTypeOf(payload).toEqualTypeOf<{ value: number }>();
    });
}

function assertContextualHandlerType(signalBus: TypedSignalBus): void {
    signalBus.subscribe("test:payload", async (context, payload) => {
        expectTypeOf(context.timestamp).toEqualTypeOf<Date>();
        expectTypeOf(payload).toEqualTypeOf<{ value: number }>();
    });
}

describe("inject()", () => {
    it("types SignalBus injections as TypedSignalBus", () => {
        expectTypeOf<ReturnType<typeof resolveSignalBus>>().toEqualTypeOf<TypedSignalBus>();
    });

    it("preserves the original token type for other injections", () => {
        expectTypeOf<ReturnType<typeof resolveExampleService>>().toEqualTypeOf<ExampleService>();
    });

    it("contextually types payload-only signal handlers", () => {
        expectTypeOf(assertPayloadHandlerType).toBeFunction();
    });

    it("contextually types contextual signal handlers", () => {
        expectTypeOf(assertContextualHandlerType).toBeFunction();
    });
});
