import { BridgeError } from "../errors/bridge";
import type { ViewDefinition } from "../modules/scanner";
import { RendererSession } from "./renderer-session";

/**
 * Maps Electron `webContentsId` values to {@link RendererSession} instances.
 *
 * Used by the bridge layer to look up which renderer process is making an IPC request
 * and determine what channels and signals it is allowed to access. View definitions are
 * registered at bootstrap time; sessions are created lazily when a renderer first
 * communicates.
 *
 * @internal
 */
export class RendererRegistry {
    private readonly sessions = new Map<number, RendererSession>();
    private readonly viewDefinitions = new Map<string, ViewDefinition>();

    /** Store a view definition so that sessions can be created for it later. */
    public registerView(viewDef: ViewDefinition): void {
        this.viewDefinitions.set(viewDef.id, viewDef);
    }

    /**
     * Return the existing session for a `webContentsId`, or create one if this is
     * the first request from that renderer.
     *
     * @throws {BridgeError} If the `viewId` does not match any registered view definition.
     */
    public getOrCreateSession(webContentsId: number, viewId: string): RendererSession {
        const existing = this.sessions.get(webContentsId);
        if (existing) return existing;

        const viewDef = this.viewDefinitions.get(viewId);
        if (!viewDef) {
            throw BridgeError.unknownRenderer(webContentsId);
        }

        const session = new RendererSession(webContentsId, viewDef);
        this.sessions.set(webContentsId, session);
        return session;
    }

    /** Look up an existing session by its `webContentsId`, or `undefined` if none exists. */
    public getSession(webContentsId: number): RendererSession | undefined {
        return this.sessions.get(webContentsId);
    }

    /** Remove a session when its renderer process is destroyed. */
    public removeSession(webContentsId: number): void {
        this.sessions.delete(webContentsId);
    }

    /** Return all active renderer sessions. */
    public getAllSessions(): readonly RendererSession[] {
        return [...this.sessions.values()];
    }
}
