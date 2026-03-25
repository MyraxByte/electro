/**
 * Metadata object passed to {@link ContextualSignalHandler} callbacks when a signal is published.
 *
 * Provides contextual information about the publication event. Handlers that need
 * access to this metadata should declare two parameters (context, payload) so the
 * {@link SignalBus} treats them as contextual handlers.
 */
export class SignalContext {
    /** Epoch timestamp (milliseconds) captured at the moment the signal was dispatched to this handler. */
    public readonly timestamp = Date.now();
}
