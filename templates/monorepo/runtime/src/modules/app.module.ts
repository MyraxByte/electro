import { Module } from "@electrojs/common";
import { app } from "electron";
import { inject } from "@electrojs/runtime";
import { ShellService } from "./app.shell.service";
import { NotesModule } from "./notes/notes.module";
import { MainView } from "./app.view";
import { MainWindow } from "./app.window";

@Module({
    imports: [NotesModule],
    providers: [ShellService],
    views: [MainView],
    windows: [MainWindow],
})
export class AppModule {
    private readonly window = inject(MainWindow);

    async onInit() {
        this.window.register();

        app.on("activate", async () => {
            if (!this.window.window) {
                this.window.register();
                await this.window.open();
                return;
            }

            this.window.show();
        });
    }

    async onReady() {
        await this.window.open();
    }
}
