import type { Rectangle, WebContents, WebContentsView, WebPreferences } from "electron";
import { emitTargetDiagnostic } from "../diagnostics";

const VIEW_STATE = Symbol("electro.view-state");

interface ViewState {
    view?: WebContentsView;
    source?: string;
    webPreferences?: WebPreferences;
}

interface GeneratedViewRegistryEntry {
    readonly id: string;
    readonly source: string;
    readonly preload?: string | null;
}

declare const __ELECTRO_VIEW_REGISTRY__: readonly GeneratedViewRegistryEntry[] | undefined;

type ViewStateCarrier = {
    [VIEW_STATE]?: ViewState;
};

const VIEW_METHOD_NAMES = ["load", "setBounds", "setBackgroundColor", "focus", "setWindowButtonVisibility"] as const;

function ensureViewState(instance: ViewStateCarrier): ViewState {
    if (!instance[VIEW_STATE]) {
        Object.defineProperty(instance, VIEW_STATE, {
            value: {},
            configurable: false,
            enumerable: false,
            writable: true,
        });
    }

    return instance[VIEW_STATE]!;
}

function getGeneratedViewRegistry(): readonly GeneratedViewRegistryEntry[] {
    return typeof __ELECTRO_VIEW_REGISTRY__ === "undefined" ? [] : __ELECTRO_VIEW_REGISTRY__;
}

function resolveBundledViewSource(source: string): string {
    const viewId = source.slice("view:".length).trim();
    const resolved = getGeneratedViewRegistry().find((entry) => entry.id === viewId)?.source;

    if (!resolved) {
        throw new Error(`Bundled view source "${source}" could not be resolved. Start the app through the ElectroJS CLI so the view registry is injected.`);
    }

    return resolved;
}

function getBundledViewEntry(source: string): GeneratedViewRegistryEntry | undefined {
    const viewId = source.slice("view:".length).trim();
    return getGeneratedViewRegistry().find((entry) => entry.id === viewId);
}

function getContentViewDescriptor(): PropertyDescriptor | undefined {
    return Object.getOwnPropertyDescriptor(ViewProvider.prototype, "contentView");
}

function getWebContentsDescriptor(): PropertyDescriptor | undefined {
    return Object.getOwnPropertyDescriptor(ViewProvider.prototype, "webContents");
}

export interface ViewAuthoringSurface {
    readonly contentView: WebContentsView | undefined;
    readonly webContents: WebContents | undefined;
    load(): Promise<void>;
    setBounds(bounds: Rectangle): void;
    setBackgroundColor(color: string): void;
    focus(): void;
    setWindowButtonVisibility(visible: boolean): void;
}

export function applyViewAuthoringApi(instance: object, source?: string, webPreferences?: WebPreferences): asserts instance is ViewAuthoringSurface {
    const target = instance as ViewStateCarrier;
    const state = ensureViewState(target);

    if (source !== undefined) {
        state.source = source;
    }

    if (webPreferences !== undefined) {
        state.webPreferences = webPreferences;
    }

    const contentViewDescriptor = getContentViewDescriptor();
    if (!("contentView" in target) && contentViewDescriptor?.get) {
        Object.defineProperty(target, "contentView", {
            configurable: true,
            enumerable: false,
            get() {
                return contentViewDescriptor.get?.call(this);
            },
        });
    }

    const webContentsDescriptor = getWebContentsDescriptor();
    if (!("webContents" in target) && webContentsDescriptor?.get) {
        Object.defineProperty(target, "webContents", {
            configurable: true,
            enumerable: false,
            get() {
                return webContentsDescriptor.get?.call(this);
            },
        });
    }

    for (const methodName of VIEW_METHOD_NAMES) {
        if (methodName in target) continue;

        Object.defineProperty(target, methodName, {
            configurable: true,
            enumerable: false,
            writable: true,
            value: ViewProvider.prototype[methodName],
        });
    }
}

/**
 * Abstract base class for view providers decorated with `@View()`.
 *
 * Extend this class to define a renderable view in your application. The framework
 * injects the source URL from the `@View()` decorator, and your subclass gains access
 * to methods for loading content, positioning, and styling.
 *
 * Views are created with strict security defaults: `sandbox: true`,
 * `contextIsolation: true`, and `nodeIntegration: false`.
 *
 * @remarks The `WebContentsView` is lazily created on the first call to {@link load}.
 *
 * @example
 * ```ts
 * @View({ source: 'view:main', access: ['app:getVersion'] })
 * class MainView extends ViewProvider {
 *     async onStart() {
 *         await this.load();
 *         this.setBounds({ x: 0, y: 0, width: 800, height: 600 });
 *     }
 * }
 * ```
 */
export abstract class ViewProvider {
    private [VIEW_STATE]: ViewState = {};

    /** The underlying Electron `WebContentsView`, or `undefined` if not yet created. */
    public get contentView(): WebContentsView | undefined {
        return this[VIEW_STATE].view;
    }

    /** The `WebContents` associated with this view, or `undefined` if not yet created. */
    public get webContents(): WebContents | undefined {
        return this[VIEW_STATE].view?.webContents;
    }

    /**
     * Create the underlying `WebContentsView` (if needed) and load the configured source URL.
     *
     * The view is lazily created on the first call. Subsequent calls reload the source.
     * If the previous view was destroyed (e.g. parent window closed), a new one is created.
     * No-ops if no source URL has been configured.
     */
    public async load(): Promise<void> {
        if (!this[VIEW_STATE].view || this[VIEW_STATE].view.webContents.isDestroyed()) {
            this[VIEW_STATE].view = undefined;
            this.createView();
        }

        const source = this[VIEW_STATE].source;
        if (!source || !this[VIEW_STATE].view) return;

        const url = ViewProvider.resolveSource(source);
        emitTargetDiagnostic(this, `loaded ${url}`);
        await this[VIEW_STATE].view.webContents.loadURL(url);
    }

    /** Set the position and size of this view within its parent window. */
    public setBounds(bounds: Rectangle): void {
        this[VIEW_STATE].view?.setBounds(bounds);
    }

    /** Set the background color of the view (e.g. `"#ffffff"` or `"transparent"`). */
    public setBackgroundColor(color: string): void {
        this[VIEW_STATE].view?.setBackgroundColor(color);
    }

    /** Give keyboard focus to this view's web contents. */
    public focus(): void {
        this[VIEW_STATE].view?.webContents.focus();
    }

    /** Show or hide the native window traffic-light buttons for this view (macOS). */
    public setWindowButtonVisibility(visible: boolean): void {
        (this[VIEW_STATE].view as { setWindowButtonVisibility?: (v: boolean) => void })?.setWindowButtonVisibility?.(visible);
    }

    private createView(): void {
        const { WebContentsView: WCV } = require("electron") as typeof import("electron");
        const userPrefs = this[VIEW_STATE].webPreferences ?? {};
        const bundledEntry =
            typeof this[VIEW_STATE].source === "string" && this[VIEW_STATE].source.startsWith("view:")
                ? getBundledViewEntry(this[VIEW_STATE].source)
                : undefined;

        this[VIEW_STATE].view = new WCV({
            webPreferences: {
                ...userPrefs,
                ...(bundledEntry?.preload ? { preload: bundledEntry.preload } : {}),
                // Security defaults — always enforced, cannot be overridden
                sandbox: true,
                contextIsolation: true,
                nodeIntegration: false,
            },
        });
        emitTargetDiagnostic(this, "created");
    }

    private static resolveSource(source: string): string {
        if (source.startsWith("http://") || source.startsWith("https://")) {
            return source;
        }
        if (source.startsWith("file:")) {
            return source;
        }
        if (source.startsWith("view:")) {
            return resolveBundledViewSource(source);
        }

        return source;
    }

    /** @internal Called by the framework to set the view source from @View metadata. */
    public static __setSource(instance: ViewProvider, source: string): void {
        ensureViewState(instance as unknown as ViewStateCarrier).source = source;
    }

    /** @internal Called by the framework to set web preferences from @View metadata. */
    public static __setWebPreferences(instance: ViewProvider, webPreferences: WebPreferences): void {
        ensureViewState(instance as unknown as ViewStateCarrier).webPreferences = webPreferences;
    }
}
