import { bridge } from "@electrojs/renderer";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import "./app.css";

type Note = {
    readonly id: string;
    readonly title: string;
    readonly content: string;
    readonly createdAt: string;
};

type ShellState = {
    readonly platform: string;
    readonly isMaximized: boolean;
};

type ViewId = "dashboard" | "notes";

const features = [
    {
        icon: "grid-view",
        title: "Module System",
        detail: "Organize your app into modules with explicit boundaries, imports, exports, and lifecycle hooks.",
    },
    {
        icon: "plug-socket",
        title: "Typed Bridge",
        detail: "Auto-generated typed IPC between main and renderer. Queries, commands, and signals — all type-safe.",
    },
    {
        icon: "tree-01",
        title: "Dependency Injection",
        detail: "Synchronous inject() with hierarchical scoping. No constructors, no service locator.",
    },
    {
        icon: "clock-01",
        title: "Lifecycle-Aware",
        detail: "onInit, onStart, onReady, onShutdown, onDispose — predictable resource management across your entire app.",
    },
    {
        icon: "computer",
        title: "Window & View System",
        detail: "Declarative window management with per-view access control and source binding.",
    },
    {
        icon: "source-code-square",
        title: "Code Generation",
        detail: "Bridge types, preload scripts, and registry metadata — generated from your source code.",
    },
] as const;

function formatDate(value: string): string {
    return new Date(value).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function App() {
    const [view, setView] = useState<ViewId>("dashboard");
    const [notes, setNotes] = useState<Note[]>([]);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [shellState, setShellState] = useState<ShellState | null>(null);
    const titleRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        void Promise.all([bridge.notes.getNotes(), bridge.app.getShellState()]).then(([loadedNotes, nextShellState]) => {
            setNotes(loadedNotes);
            setShellState(nextShellState);
        });
    }, []);

    async function handleCreate() {
        const nextTitle = title.trim();
        const nextContent = content.trim();

        if (!nextTitle) {
            return;
        }

        const note = await bridge.notes.createNote(nextTitle, nextContent);
        setNotes((current) => [note, ...current]);
        setTitle("");
        setContent("");
        titleRef.current?.focus();
    }

    async function handleDelete(id: string) {
        const removed = await bridge.notes.deleteNote(id);
        if (removed) {
            setNotes((current) => current.filter((note) => note.id !== id));
        }
    }

    async function handleToggleMaximize() {
        const nextState = await bridge.app.toggleMaximizeWindow();
        setShellState(nextState);
    }

    async function handleOpenDocumentation() {
        await bridge.app.openDocumentation();
    }

    function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && title.trim()) {
            void handleCreate();
        }
    }

    const isMacOS = shellState?.platform === "darwin";

    return (
        <div className="desktop-root">
            <div className="plasma-orb plasma-orb-1" aria-hidden="true" />
            <div className="plasma-orb plasma-orb-2" aria-hidden="true" />
            <div className="plasma-orb plasma-orb-3" aria-hidden="true" />

            <div className="window-shell">
                <header className="titlebar drag-region">
                    <div className="titlebar-leading">
                        {isMacOS ? (
                            <div className="window-controls window-controls-mac no-drag">
                                <button className="window-control mac-close" onClick={() => void bridge.app.closeWindow()} aria-label="Close window" />
                                <button className="window-control mac-minimize" onClick={() => void bridge.app.minimizeWindow()} aria-label="Minimize window" />
                                <button
                                    className="window-control mac-maximize"
                                    onClick={() => void handleToggleMaximize()}
                                    aria-label={shellState?.isMaximized ? "Restore window" : "Maximize window"}
                                />
                            </div>
                        ) : (
                            <div className="titlebar-brand no-drag">
                                <span className="titlebar-mark" />
                                <span className="titlebar-brand-text">ElectroJS</span>
                            </div>
                        )}
                    </div>

                    <div className="titlebar-center">
                        <span className="titlebar-project">demo-app</span>
                    </div>

                    <div className="titlebar-actions no-drag">
                        {!isMacOS && (
                            <div className="window-controls">
                                <button
                                    className="window-control window-control-button"
                                    onClick={() => void bridge.app.minimizeWindow()}
                                    aria-label="Minimize window"
                                >
                                    <span className="control-line" />
                                </button>
                                <button
                                    className="window-control window-control-button"
                                    onClick={() => void handleToggleMaximize()}
                                    aria-label="Toggle maximize"
                                >
                                    <span className={shellState?.isMaximized ? "control-restore" : "control-square"} />
                                </button>
                                <button
                                    className="window-control window-control-button window-control-close"
                                    onClick={() => void bridge.app.closeWindow()}
                                    aria-label="Close window"
                                >
                                    <span className="control-close" />
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                <div className="app-body">
                    <aside className="sidebar">
                        <div className="sidebar-brand">
                            <svg className="sidebar-logo" width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                    <linearGradient id="g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                                        <stop offset="0%" stop-color="#FBBF24" />
                                        <stop offset="50%" stop-color="#F97316" />
                                        <stop offset="100%" stop-color="#EF4444" />
                                    </linearGradient>
                                </defs>
                                <rect width="32" height="32" rx="8" />
                                <path d="M9 8h14l-3 7h5L12 26l2-9H9z" fill="url(#g)" />
                            </svg>

                            <span className="sidebar-logo-text">ElectroJS</span>
                        </div>

                        <nav className="sidebar-nav" aria-label="App navigation">
                            <button className={view === "dashboard" ? "nav-item is-active" : "nav-item"} onClick={() => setView("dashboard")}>
                                <svg
                                    className="nav-icon"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <rect x="3" y="3" width="7" height="7" rx="1.5" />
                                    <rect x="14" y="3" width="7" height="7" rx="1.5" />
                                    <rect x="3" y="14" width="7" height="7" rx="1.5" />
                                    <rect x="14" y="14" width="7" height="7" rx="1.5" />
                                </svg>
                                Dashboard
                            </button>
                            <button className={view === "notes" ? "nav-item is-active" : "nav-item"} onClick={() => setView("notes")}>
                                <svg
                                    className="nav-icon"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                                    <path d="M14 2v6h6" />
                                    <line x1="8" y1="13" x2="16" y2="13" />
                                    <line x1="8" y1="17" x2="16" y2="17" />
                                </svg>
                                Notes
                                {notes.length > 0 && <span className="nav-badge">{notes.length}</span>}
                            </button>
                        </nav>

                        <div className="sidebar-footer">
                            <button className="docs-button" onClick={() => void handleOpenDocumentation()}>
                                <svg
                                    className="docs-icon"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2Z" />
                                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7Z" />
                                </svg>
                                Documentation
                                <svg
                                    className="docs-arrow"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M7 17L17 7" />
                                    <path d="M7 7h10v10" />
                                </svg>
                            </button>

                            <div className="sidebar-meta">
                                <span className="meta-dot" />
                                <span className="meta-text">Runtime connected</span>
                            </div>
                        </div>
                    </aside>

                    <main className="content" onKeyDown={handleKeyDown}>
                        {view === "dashboard" && (
                            <div className="dashboard">
                                <div className="hero">
                                    <p className="hero-eyebrow">Desktop starter</p>
                                    <h1 className="hero-title">
                                        Build with <span className="gradient-text">ElectroJS</span>
                                    </h1>
                                    <p className="hero-tagline">Modules. Typed IPC. Dependency injection. Built for desktop.</p>
                                    <div className="hero-actions">
                                        <button className="action-primary" onClick={() => setView("notes")}>
                                            Try the demo
                                            <svg
                                                className="action-icon"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <path d="M5 12h14" />
                                                <path d="m12 5 7 7-7 7" />
                                            </svg>
                                        </button>
                                        <button className="action-secondary" onClick={() => void handleOpenDocumentation()}>
                                            Read the docs
                                        </button>
                                    </div>
                                </div>

                                <section className="features">
                                    <p className="section-label">Framework features</p>
                                    <div className="feature-grid">
                                        {features.map((feature) => (
                                            <article key={feature.title} className="feature-card">
                                                <i className={`feature-icon hgi-stroke hgi-${feature.icon}`} />
                                                <h3 className="feature-title">{feature.title}</h3>
                                                <p className="feature-detail">{feature.detail}</p>
                                            </article>
                                        ))}
                                    </div>
                                </section>

                                <section className="architecture">
                                    <p className="section-label">This app demonstrates</p>
                                    <div className="arch-grid">
                                        <div className="arch-card">
                                            <code className="arch-code">@Module</code>
                                            <p className="arch-text">Root module composing providers, views, windows, and imports</p>
                                        </div>
                                        <div className="arch-card">
                                            <code className="arch-code">@Window</code>
                                            <p className="arch-text">Frameless shell with custom title bar and native controls</p>
                                        </div>
                                        <div className="arch-card">
                                            <code className="arch-code">@query · @command</code>
                                            <p className="arch-text">Typed bridge methods for reading and writing runtime state</p>
                                        </div>
                                        <div className="arch-card">
                                            <code className="arch-code">@View</code>
                                            <p className="arch-text">Explicit access control declaring which bridge methods are available</p>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {view === "notes" && (
                            <div className="notes-view">
                                <div className="notes-header">
                                    <div>
                                        <p className="section-label">Live runtime demo</p>
                                        <h2 className="view-title">Scratchpad</h2>
                                        <p className="view-description">
                                            Create and delete notes through the typed bridge. Every action crosses from the renderer into a runtime-owned
                                            service.
                                        </p>
                                    </div>
                                </div>

                                <div className="notes-layout">
                                    <div className="composer">
                                        <div className="field">
                                            <label className="field-label" htmlFor="note-title">
                                                Title
                                            </label>
                                            <input
                                                ref={titleRef}
                                                id="note-title"
                                                className="field-input"
                                                placeholder="Note title..."
                                                value={title}
                                                onChange={(event) => setTitle(event.target.value)}
                                            />
                                        </div>

                                        <div className="field">
                                            <label className="field-label" htmlFor="note-content">
                                                Content
                                            </label>
                                            <textarea
                                                id="note-content"
                                                className="field-input field-textarea"
                                                placeholder="Write something..."
                                                value={content}
                                                onChange={(event) => setContent(event.target.value)}
                                            />
                                        </div>

                                        <button className="create-button" onClick={() => void handleCreate()} disabled={!title.trim()}>
                                            Create note
                                            <span className="button-shortcut">{isMacOS ? "Cmd" : "Ctrl"} + Enter</span>
                                        </button>
                                    </div>

                                    <div className="notes-feed">
                                        <div className="feed-header">
                                            <span className="feed-title">Notes</span>
                                            <span className="feed-count">{notes.length}</span>
                                        </div>

                                        <div className="feed-body">
                                            {notes.length === 0 ? (
                                                <div className="empty-state">
                                                    <div className="empty-icon-wrap">
                                                        <svg
                                                            className="empty-icon"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="1.5"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        >
                                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                                                            <path d="M14 2v6h6" />
                                                        </svg>
                                                    </div>
                                                    <p className="empty-title">No notes yet</p>
                                                    <p className="empty-copy">Create your first note to verify the runtime bridge is live.</p>
                                                </div>
                                            ) : (
                                                <div className="note-list">
                                                    {notes.map((note) => (
                                                        <article key={note.id} className="note-card">
                                                            <div className="note-body">
                                                                <h3 className="note-title">{note.title}</h3>
                                                                {note.content && <p className="note-content">{note.content}</p>}
                                                                <time className="note-time">{formatDate(note.createdAt)}</time>
                                                            </div>
                                                            <button className="note-delete" onClick={() => void handleDelete(note.id)} aria-label="Delete note">
                                                                <svg
                                                                    viewBox="0 0 24 24"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    strokeWidth="1.5"
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                >
                                                                    <path d="M3 6h18" />
                                                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                                                </svg>
                                                            </button>
                                                        </article>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bridge-info">
                                        <p className="section-label">Bridge methods used</p>
                                        <div className="bridge-methods">
                                            <code className="bridge-method">
                                                <span className="method-type">query</span>
                                                bridge.notes.getNotes()
                                            </code>
                                            <code className="bridge-method">
                                                <span className="method-type">command</span>
                                                bridge.notes.createNote()
                                            </code>
                                            <code className="bridge-method">
                                                <span className="method-type">command</span>
                                                bridge.notes.deleteNote()
                                            </code>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}
