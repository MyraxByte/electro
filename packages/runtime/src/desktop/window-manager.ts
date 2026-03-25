import type { ProviderRef } from "../modules/refs";
import { applyWindowAuthoringApi, WindowProvider } from "./window-provider";

/**
 * Framework-internal registry that tracks all `@Window()` providers in the application.
 *
 * Handles registration (including injecting `@Window()` configuration into the base class)
 * and provides lookup by window ID. Consumers typically interact with windows through
 * their {@link WindowProvider} subclass rather than this manager directly.
 *
 * @internal
 */
export class WindowManager {
    private readonly windows = new Map<string, ProviderRef>();

    /**
     * Register a window provider and apply its `@Window()` configuration.
     *
     * @remarks Silently skips providers that do not have window metadata.
     */
    public register(providerRef: ProviderRef): void {
        const windowDef = providerRef.definition.window;
        if (!windowDef) return;

        this.windows.set(windowDef.id, providerRef);

        applyWindowAuthoringApi(providerRef.instance, windowDef.configuration as import("electron").BaseWindowConstructorOptions | undefined);
    }

    /** Look up a registered window provider by its window ID. */
    public get(windowId: string): ProviderRef | undefined {
        return this.windows.get(windowId);
    }

    /** Return all registered window providers. */
    public list(): readonly ProviderRef[] {
        return [...this.windows.values()];
    }

    /** Close all managed windows and clear the registry. */
    public async dispose(): Promise<void> {
        for (const providerRef of this.windows.values()) {
            if (providerRef.instance instanceof WindowProvider || "close" in (providerRef.instance as object)) {
                (providerRef.instance as WindowProvider).close();
            }
        }
        this.windows.clear();
    }
}
