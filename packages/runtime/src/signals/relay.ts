import { emitTargetError } from "../diagnostics";

/**
 * Callback invoked by {@link PublicationRelay} whenever a signal is published.
 *
 * Typically used by the renderer registry to forward signals from the main process
 * to renderer processes that have opted in via `@View({ signals: [...] })`.
 */
export type SignalPublishListener = (signalId: string, payload: unknown) => void;

/**
 * Forwards signal publications to one or more external listeners.
 *
 * The relay sits between the {@link SignalBus} and any downstream consumers
 * (e.g. renderer processes) that need to observe signals published on the main process.
 * Listener errors are caught and logged so one failing listener cannot break others.
 *
 * @internal This is a framework-internal building block; consumers interact with signals
 * via {@link SignalBus} instead.
 */
export class PublicationRelay {
    private readonly listeners = new Set<SignalPublishListener>();

    /**
     * Add a listener that will be called on every signal publication.
     *
     * @returns A dispose function that removes the listener.
     */
    public connect(listener: SignalPublishListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * Notify all connected listeners about a published signal.
     *
     * @remarks Errors thrown by individual listeners are caught and logged;
     * they do not prevent other listeners from being notified.
     */
    public publish(signalId: string, payload: unknown): void {
        for (const listener of this.listeners) {
            try {
                listener(signalId, payload);
            } catch (error) {
                emitTargetError(`SignalRelay:${signalId}`, "publication failed", error);
            }
        }
    }
}
