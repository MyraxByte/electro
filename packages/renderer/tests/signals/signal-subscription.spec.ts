import { describe, expect, it, vi } from "vitest";
import { SignalSubscription } from "../../src/signals/signal-subscription";

describe("SignalSubscription", () => {
    it("calls dispose on first unsubscribe", () => {
        const dispose = vi.fn();
        const subscription = new SignalSubscription(dispose);

        subscription.unsubscribe();

        expect(dispose).toHaveBeenCalledTimes(1);
    });

    it("does not call dispose more than once", () => {
        const dispose = vi.fn();
        const subscription = new SignalSubscription(dispose);

        subscription.unsubscribe();
        subscription.unsubscribe();
        subscription.unsubscribe();

        expect(dispose).toHaveBeenCalledTimes(1);
    });
});
