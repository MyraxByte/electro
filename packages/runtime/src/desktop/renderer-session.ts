import type { ViewDefinition } from "../modules/scanner";

/**
 * Tracks the capabilities of a single renderer process (identified by `webContentsId`).
 *
 * Each session records which bridge channels the renderer may invoke and which signals
 * it is allowed to receive, as declared in the `@View()` decorator metadata. The
 * {@link BridgeAccessGuard} and signal relay use this information to enforce per-view
 * access control.
 *
 * @internal Created and managed by {@link RendererRegistry}.
 */
export class RendererSession {
    /** The view ID this renderer is associated with. */
    public readonly viewId: string;
    /** Set of bridge channel names this renderer is allowed to invoke. */
    public readonly access: ReadonlySet<string>;
    /** Set of signal IDs this renderer is allowed to receive. */
    public readonly allowedSignals: ReadonlySet<string>;

    public constructor(
        /** The Electron `webContents.id` that uniquely identifies this renderer process. */
        public readonly rendererId: number,
        viewDef: ViewDefinition,
    ) {
        this.viewId = viewDef.id;
        this.access = new Set(viewDef.access);
        this.allowedSignals = new Set(viewDef.signals);
    }

    /** Check whether this renderer has access to the given bridge channel. */
    public hasAccess(channel: string): boolean {
        return this.access.has(channel);
    }

    /** Check whether this renderer is allowed to receive the given signal. */
    public canReceiveSignal(signalId: string): boolean {
        return this.allowedSignals.has(signalId);
    }
}
