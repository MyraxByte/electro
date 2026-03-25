import React, { useEffect, useState } from "react";
import { bridge } from "@electro/renderer";

// In a real app, this package's generated `electro-env.d.ts`
// makes `bridge` fully typed automatically.

export function App() {
    const [notes, setNotes] = useState<{ id: string; title: string; content: string }[]>([]);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");

    useEffect(() => {
        const loadNotes = async () => {
            const loadedNotes = await bridge.notes.getNotes();
            setNotes(loadedNotes);
        };
        loadNotes();
    }, []);

    const handleCreate = async () => {
        if (!title.trim()) return;
        // Example bridge call — typesafe in generated code:
        // const note = await electro.notes.createNote(title, content);
        // setNotes((prev) => [...prev, note]);
        const note = await bridge.notes.createNote(title, content);
        setNotes((prev) => [...prev, note]);
        setTitle("");
        setContent("");
    };

    const handleDelete = async (id: string) => {
        // await electro.notes.deleteNote(id);
        await bridge.notes.deleteNote(id);
        setNotes((prev) => prev.filter((n) => n.id !== id));
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "24px", gap: "20px" }}>
            <header>
                <h1 style={{ fontSize: "22px", fontWeight: 600, letterSpacing: "-0.02em" }}>📝 Notes</h1>
                <p style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                    Monorepo view — <code>@emono/view-main</code>
                </p>
            </header>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title…" style={inputStyle} />
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Content…"
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical" }}
                />
                <button onClick={handleCreate} disabled={!title.trim()} style={buttonStyle}>
                    Add Note
                </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                {notes.length === 0 && <p style={{ color: "#555", fontSize: "14px", textAlign: "center", marginTop: "40px" }}>No notes yet. Add one above.</p>}
                {notes.map((note) => (
                    <div key={note.id} style={noteStyle}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, marginBottom: "4px" }}>{note.title}</div>
                            {note.content && <div style={{ fontSize: "13px", color: "#aaa" }}>{note.content}</div>}
                        </div>
                        <button onClick={() => handleDelete(note.id)} style={deleteStyle}>
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: "8px",
    color: "#e5e5e5",
    fontSize: "14px",
    padding: "10px 12px",
    outline: "none",
    width: "100%",
};

const buttonStyle: React.CSSProperties = {
    background: "#3b82f6",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
    padding: "10px 16px",
};

const noteStyle: React.CSSProperties = {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: "8px",
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "12px 14px",
};

const deleteStyle: React.CSSProperties = {
    background: "transparent",
    border: "none",
    color: "#666",
    cursor: "pointer",
    fontSize: "14px",
    padding: "2px",
};
