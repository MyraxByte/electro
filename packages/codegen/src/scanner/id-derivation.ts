/**
 * ID derivation utilities for module, method, signal, and job identifiers.
 *
 * These must match the runtime's derivation logic exactly:
 * - Module ID: `@Module({ id })` or strip "Module" suffix + lowercase
 * - View ID: `@View({ source: "view:<id>" })` or explicit `{ id }` for external views
 * - Method/Signal/Job ID: explicit `{ id }` from decorator or fall back to method name
 *
 * @module scanner/id-derivation
 */

/**
 * Derive a module ID from its class name and optional explicit ID.
 *
 * Rules:
 * 1. If `explicitId` is provided and non-empty after trimming, use it.
 * 2. Otherwise, strip "Module" suffix from `className` and lowercase the first char.
 *
 * @example
 * deriveModuleId("AuthModule")         // → "auth"
 * deriveModuleId("WorkspaceModule")    // → "workspace"
 * deriveModuleId("Foo")                // → "foo"
 * deriveModuleId("AuthModule", "auth") // → "auth"
 */
export function deriveModuleId(className: string, explicitId?: string | null): string {
    const trimmed = explicitId?.trim();
    if (trimmed && trimmed.length > 0) return trimmed;

    const baseName = className.endsWith("Module") ? className.slice(0, -"Module".length) : className;
    const name = baseName.length > 0 ? baseName : className;
    return name.charAt(0).toLowerCase() + name.slice(1);
}

/**
 * Derive a method/signal/job ID from decorator options or method name.
 *
 * @example
 * deriveMethodId("login")            // → "login"
 * deriveMethodId("login", "signIn")  // → "signIn"
 */
export function deriveMethodId(methodName: string, explicitId?: string | null): string {
    const trimmed = explicitId?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : methodName;
}

/**
 * Derive a view ID from its source and optional explicit ID.
 *
 * Rules:
 * 1. Bundled views (`view:<id>`) derive their id from the source.
 * 2. External views (`file:`, `http:`, `https:`) use the explicit id.
 *
 * @example
 * deriveViewId("view:main")                    // → "main"
 * deriveViewId("file:./index.html", "auth")   // → "auth"
 */
export function deriveViewId(source: string, explicitId?: string | null): string | null {
    const trimmedSource = source.trim();

    if (trimmedSource.startsWith("view:")) {
        const derivedId = trimmedSource.slice("view:".length).trim();
        return derivedId.length > 0 ? derivedId : null;
    }

    const trimmedId = explicitId?.trim();
    return trimmedId && trimmedId.length > 0 ? trimmedId : null;
}
