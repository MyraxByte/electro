import type { BaseWindow, BaseWindowConstructorOptions, Rectangle } from "electron";
import { emitTargetDiagnostic } from "../diagnostics";
import type { ViewProvider } from "./view-provider";

const WINDOW_STATE = Symbol("electro.window-state");

interface WindowState {
    window?: BaseWindow;
    configuration?: BaseWindowConstructorOptions;
}

type WindowStateCarrier = {
    [WINDOW_STATE]?: WindowState;
};

const WINDOW_METHOD_NAMES = ["create", "mount", "show", "hide", "focus", "close", "getBounds"] as const;

function ensureWindowState(instance: WindowStateCarrier): WindowState {
    if (!instance[WINDOW_STATE]) {
        Object.defineProperty(instance, WINDOW_STATE, {
            value: {},
            configurable: false,
            enumerable: false,
            writable: true,
        });
    }

    return instance[WINDOW_STATE]!;
}

function getWindowDescriptor(): PropertyDescriptor | undefined {
    return Object.getOwnPropertyDescriptor(WindowProvider.prototype, "window");
}

export interface WindowAuthoringSurface {
    readonly window: BaseWindow | undefined;
    create(): void;
    mount(view: Pick<ViewProvider, "contentView">): void;
    show(): void;
    hide(): void;
    focus(): void;
    close(): void;
    getBounds(): Rectangle | undefined;
}

export function applyWindowAuthoringApi(instance: object, configuration?: BaseWindowConstructorOptions): asserts instance is WindowAuthoringSurface {
    const target = instance as WindowStateCarrier;
    const state = ensureWindowState(target);

    if (configuration !== undefined) {
        state.configuration = configuration;
    }

    const windowDescriptor = getWindowDescriptor();
    if (!("window" in target) && windowDescriptor?.get) {
        Object.defineProperty(target, "window", {
            configurable: true,
            enumerable: false,
            get() {
                return windowDescriptor.get?.call(this);
            },
        });
    }

    for (const methodName of WINDOW_METHOD_NAMES) {
        if (methodName in target) continue;

        Object.defineProperty(target, methodName, {
            configurable: true,
            enumerable: false,
            writable: true,
            value: WindowProvider.prototype[methodName],
        });
    }
}

/**
 * Abstract base class for window providers decorated with `@Window()`.
 *
 * Extend this class to define a window in your application. The framework injects
 * configuration from the `@Window()` decorator metadata, and your subclass gains
 * access to lifecycle methods like {@link create}, {@link show}, {@link mount}, and {@link close}.
 *
 * @remarks The native `BaseWindow` instance is only available after calling {@link create}.
 * Calling lifecycle methods before `create()` is safe (they no-op) but the window
 * will not exist on screen.
 *
 * @example
 * ```ts
 * @Window({ width: 800, height: 600, show: false })
 * class MainWindow extends WindowProvider {
 *     async onStart() {
 *         this.create();
 *         this.mount(this.mainView);
 *         this.show();
 *     }
 * }
 * ```
 */
export abstract class WindowProvider {
    private [WINDOW_STATE]: WindowState = {};

    /** The underlying Electron `BaseWindow` instance, or `undefined` if not yet created. */
    public get window(): BaseWindow | undefined {
        return this[WINDOW_STATE].window;
    }

    /** Create the native `BaseWindow` using configuration from the `@Window()` decorator. */
    public create(): void {
        if (this[WINDOW_STATE].window) return;

        const { BaseWindow: BW } = require("electron") as typeof import("electron");
        const config = this[WINDOW_STATE].configuration ?? {};

        const window = new BW(config);
        this[WINDOW_STATE].window = window;

        window.on("closed", () => {
            this[WINDOW_STATE].window = undefined;
            emitTargetDiagnostic(this, "closed");
        });

        emitTargetDiagnostic(this, "created");
    }

    /**
     * Attach a view's content to this window.
     *
     * The view's `WebContentsView` is added as a child view of the window's content area.
     * No-ops silently if the window or view has not been created yet.
     */
    public mount(view: ViewProvider): void {
        const window = this[WINDOW_STATE].window;
        if (!window) return;

        const contentView = view.contentView;
        if (!contentView) return;

        window.contentView.addChildView(contentView);
        emitTargetDiagnostic(this, `mounted ${view.constructor.name || "ViewProvider"}`);
    }

    /** Show the window. No-ops if the window has not been created. */
    public show(): void {
        const window = this[WINDOW_STATE].window;
        if (!window) return;

        window.show();
        emitTargetDiagnostic(this, "shown");
    }

    /** Hide the window without destroying it. */
    public hide(): void {
        this[WINDOW_STATE].window?.hide();
    }

    /** Bring the window to the front and give it focus. */
    public focus(): void {
        this[WINDOW_STATE].window?.focus();
    }

    /** Close and destroy the native window, releasing its resources. */
    public close(): void {
        const window = this[WINDOW_STATE].window;
        if (!window) return;

        window.destroy();
    }

    /** Return the window's current screen bounds, or `undefined` if not created. */
    public getBounds(): Rectangle | undefined {
        return this[WINDOW_STATE].window?.getBounds();
    }

    /** @internal Called by the framework to set the window configuration from @Window metadata. */
    public static __setConfiguration(instance: WindowProvider, configuration?: BaseWindowConstructorOptions): void {
        ensureWindowState(instance as unknown as WindowStateCarrier).configuration = configuration;
    }
}
