import type { RendererSignalSubscription } from "../types/public-api";

export class SignalSubscription implements RendererSignalSubscription {
    private unsubscribed = false;

    public constructor(private readonly dispose: () => void) {}

    public unsubscribe(): void {
        if (this.unsubscribed) {
            return;
        }

        this.unsubscribed = true;
        this.dispose();
    }
}
