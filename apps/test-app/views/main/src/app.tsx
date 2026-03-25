import { bridge } from "@electrojs/renderer";
import { useEffect, useRef, useState } from "react";
import "./app.css";

type Note = {
    readonly id: string;
    readonly title: string;
    readonly content: string;
    readonly createdAt: string;
};

export function App() {
    const [notes, setNotes] = useState<Note[]>([]);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const titleRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // void bridge.notes.getNotes().then(setNotes);
    }, []);

    async function handleCreate() {
        if (!title.trim()) return;

        const note = await bridge.notes.createNote(title, content);
        setNotes((current) => [note, ...current]);
        setTitle("");
        setContent("");
        titleRef.current?.focus();
    }

    async function handleDelete(id: string) {
        const removed = await bridge.notes.deleteNote(id);
        if (removed) {
            setNotes((current) => current.filter((n) => n.id !== id));
        }
    }

    function handleKeyDown(event: React.KeyboardEvent) {
        if (event.key === "Enter" && event.metaKey && title.trim()) {
            void handleCreate();
        }
    }

    return (
        <div className="page">
            {/* ── Welcome ─────────────────────── */}
            <section className="hero">
                <span className="hero-badge">
                    <span className="hero-badge-dot" />
                    Electro Starter
                </span>
                <h1 className="hero-heading">
                    You're all set.{" "}
                    <span className="hero-heading-dim">
                        Start building.
                    </span>
                </h1>
                <p className="hero-sub">
                    This view talks to the runtime through a typed{" "}
                    <code>bridge</code> — commands, queries, and signals
                    cross the IPC boundary with full type safety.
                </p>
            </section>

            {/* ── Demo ────────────────────────── */}
            <section className="demo-section">
                <div className="demo-frame" onKeyDown={handleKeyDown}>
                    <div className="demo-toolbar">
                        <div className="demo-dots">
                            <span className="demo-dot" />
                            <span className="demo-dot" />
                            <span className="demo-dot" />
                        </div>
                        <span className="demo-toolbar-title">
                            @views/main
                        </span>
                    </div>

                    <div className="demo-body">
                        <aside className="sidebar">
                            <span className="sidebar-label">Create</span>
                            <div className="form">
                                <div className="field">
                                    <label className="field-label" htmlFor="note-title">Title</label>
                                    <input
                                        ref={titleRef}
                                        id="note-title"
                                        className="field-input"
                                        placeholder="Note title..."
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                    />
                                </div>
                                <div className="field">
                                    <label className="field-label" htmlFor="note-content">Content</label>
                                    <textarea
                                        id="note-content"
                                        className="field-input field-textarea"
                                        placeholder="Write something..."
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                    />
                                </div>
                                <button
                                    className="btn-create"
                                    onClick={() => void handleCreate()}
                                    disabled={!title.trim()}
                                >
                                    Create note
                                    <span className="shortcut">&#8984;&#9166;</span>
                                </button>
                            </div>
                        </aside>

                        <section className="notes-panel">
                            <div className="notes-bar">
                                <span className="notes-bar-label">Notes</span>
                                {notes.length > 0 && (
                                    <span className="count-pill">{notes.length}</span>
                                )}
                            </div>

                            {notes.length === 0 ? (
                                <div className="empty">
                                    <div className="empty-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 19H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v3" />
                                            <path d="M16 19h6M19 16v6" />
                                        </svg>
                                    </div>
                                    <p className="empty-heading">No notes yet</p>
                                    <p className="empty-copy">
                                        Create a note — it crosses the typed{" "}
                                        <code>bridge</code> to the runtime and back.
                                    </p>
                                </div>
                            ) : (
                                <div className="notes-list">
                                    {notes.map((note, i) => (
                                        <article
                                            key={note.id}
                                            className="note"
                                            style={{ animationDelay: `${i * 0.03}s` }}
                                        >
                                            <div className="note-body">
                                                <h2 className="note-title">{note.title}</h2>
                                                {note.content && (
                                                    <p className="note-content">{note.content}</p>
                                                )}
                                                <time className="note-meta">
                                                    {new Date(note.createdAt).toLocaleString()}
                                                </time>
                                            </div>
                                            <button
                                                className="btn-remove"
                                                onClick={() => void handleDelete(note.id)}
                                            >
                                                Remove
                                            </button>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </section>
        </div>
    );
}
