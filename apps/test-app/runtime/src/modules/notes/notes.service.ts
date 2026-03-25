import { Injectable, command, query } from "@electro/common";

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
            id: "welcome",
            title: "Welcome to Electro",
            content: "This note comes from the runtime module through the typed bridge.",
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
