import { Injectable, command, query } from "@electrojs/common";

export interface Note {
    readonly id: string;
    readonly title: string;
    readonly content: string;
    readonly createdAt: string;
}

@Injectable()
export class NotesService {
    private readonly notes: Note[] = [
        {
            id: "bridge-demo",
            title: "Bridge is connected",
            content:
                "This note was loaded via bridge.notes.getNotes() — a @query method in the runtime. Try creating and deleting notes to test @command methods.",
            createdAt: new Date().toISOString(),
        },
        {
            id: "architecture",
            title: "How this app works",
            content: "AppModule composes the runtime graph. ShellService exposes window controls. NotesService handles CRUD. Everything is typed end-to-end.",
            createdAt: new Date().toISOString(),
        },
    ];

    @query()
    getNotes(): Note[] {
        return [...this.notes];
    }

    @command()
    createNote(title: string, content: string): Note {
        const note: Note = {
            id: crypto.randomUUID(),
            title,
            content,
            createdAt: new Date().toISOString(),
        };

        this.notes.unshift(note);
        return note;
    }

    @command()
    deleteNote(id: string): boolean {
        const index = this.notes.findIndex((note) => note.id === id);
        if (index === -1) {
            return false;
        }

        this.notes.splice(index, 1);
        return true;
    }
}
