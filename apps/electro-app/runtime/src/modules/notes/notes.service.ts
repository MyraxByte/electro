import { Injectable, command, query } from "@electro/common";
import Store from "electron-store";

export interface Note {
    readonly id: string;
    readonly title: string;
    readonly content: string;
    readonly createdAt: string;
}

interface NotesStore {
    notes: Note[];
}

@Injectable()
export class NotesService {
    private store = new Store<NotesStore>({
        name: "notes",
        defaults: {
            notes: [],
        },
    });

    @command()
    createNote(title: string, content: string): Note {
        const note: Note = {
            id: crypto.randomUUID(),
            title,
            content,
            createdAt: new Date().toISOString(),
        };

        const notes = this.store.get("notes", []) as Note[];
        notes.push(note);
        this.store.set("notes", notes);

        return note;
    }

    @query()
    getNotes(): Note[] {
        return this.store.get("notes", []) as Note[];
    }

    @query()
    getNote(id: string): Note | null {
        return (this.store.get("notes", []) as Note[]).find((n) => n.id === id) ?? null;
    }

    @command()
    deleteNote(id: string): boolean {
        const notes = this.store.get("notes", []) as Note[];
        const index = notes.findIndex((n) => n.id === id);
        if (index === -1) return false;
        notes.splice(index, 1);
        this.store.set("notes", notes);
        return true;
    }
}
