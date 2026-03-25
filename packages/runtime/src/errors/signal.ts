import { RuntimeError } from "./runtime";

/**
 * Errors thrown when signal dispatching or registration fails.
 *
 * All instances are created through static factory methods; direct construction is not allowed.
 */
export class SignalError extends RuntimeError {
    private constructor(message: string, code: string, context?: Readonly<Record<string, unknown>>) {
        super(message, code, context);
    }

    /** The provided signal id is not a non-empty string. */
    public static invalidSignalId(signalId: unknown): SignalError {
        return new SignalError(
            `Invalid signal id: expected a non-empty string, got ${typeof signalId === "string" ? `"${signalId}"` : String(signalId)}.`,
            "ELECTRO_SIGNAL_INVALID_ID",
            { signalId: String(signalId) },
        );
    }
}
