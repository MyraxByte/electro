/**
 * Check whether a value can be safely serialized over IPC (structured-clone compatible).
 *
 * Returns `true` for primitives, plain objects, and arrays whose members are
 * themselves serializable. Returns `false` for functions, symbols, bigints,
 * and class instances (objects whose prototype is not `Object.prototype` or `null`).
 *
 * @remarks This is a conservative check -- it does not cover every type supported
 * by the structured clone algorithm (e.g. `Date`, `Map`, `Set` are rejected).
 */
export function isSerializable(value: unknown): boolean {
    if (value === null || value === undefined) return true;

    const type = typeof value;
    if (type === "string" || type === "number" || type === "boolean") return true;

    if (type === "function" || type === "symbol" || type === "bigint") return false;

    if (Array.isArray(value)) {
        return value.every(isSerializable);
    }

    if (type === "object") {
        const proto = Object.getPrototypeOf(value);
        if (proto !== Object.prototype && proto !== null) return false;

        return Object.values(value as Record<string, unknown>).every(isSerializable);
    }

    return false;
}

/**
 * Convert an error into a plain object suitable for IPC transport.
 *
 * Extracts `message`, optional `code`, and optional `context` from `Error` instances.
 * Non-Error values are coerced to a string message.
 */
export function serializeBridgeError(error: unknown): {
    message: string;
    code?: string;
    context?: Record<string, unknown>;
} {
    if (error instanceof Error) {
        return {
            message: error.message,
            code: (error as { code?: string }).code,
            context: (error as { context?: Record<string, unknown> }).context,
        };
    }

    return { message: String(error) };
}
