import type { ProviderRef } from "../modules/refs";
import { applyViewAuthoringApi } from "./view-provider";

/**
 * Framework-internal registry that tracks all `@View()` providers in the application.
 *
 * Handles registration (including injecting the source URL into the base class)
 * and provides lookup by view ID. Consumers typically interact with views through
 * their {@link ViewProvider} subclass rather than this manager directly.
 *
 * @internal
 */
export class ViewManager {
    private readonly views = new Map<string, ProviderRef>();

    /**
     * Register a view provider and apply its `@View()` source URL.
     *
     * @remarks Silently skips providers that do not have view metadata.
     */
    public register(providerRef: ProviderRef): void {
        const viewDef = providerRef.definition.view;
        if (!viewDef) return;

        this.views.set(viewDef.id, providerRef);

        applyViewAuthoringApi(providerRef.instance, viewDef.source, viewDef.configuration?.webPreferences);
    }

    /** Look up a registered view provider by its view ID. */
    public get(viewId: string): ProviderRef | undefined {
        return this.views.get(viewId);
    }

    /** Return all registered view providers. */
    public list(): readonly ProviderRef[] {
        return [...this.views.values()];
    }

    /** Clear the registry. Does not destroy any underlying web contents. */
    public async dispose(): Promise<void> {
        this.views.clear();
    }
}
