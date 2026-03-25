import { Module } from "@electrojs/common";
import { NotesService } from "./notes.service";

@Module({
    providers: [NotesService],
    exports: [NotesService],
})
export class NotesModule {}
