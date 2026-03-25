import { Module } from "@electro/common";
import { AuthModule } from "./auth/auth.module";
import { NotesModule } from "./notes/notes.module";
import { UpdaterModule } from "./updater/updater.module";
import { SettingsModule } from "./settings/settings.module";
import { DeeplinkerModule } from "./deeplinker/deeplinker.module";
import { HttpModule } from "./http/http.module";
import { StorageModule } from "./storage/storage.module";
import { MainView } from "./app.view";
import { MainWindow } from "./app.window";
import { inject, SignalBus } from "@electro/runtime";
import { app } from "electron";
import { AuthService } from "./auth/auth.service";
import { StartupModule } from "./startup/startup.module";

@Module({
    imports: [AuthModule, DeeplinkerModule, HttpModule, NotesModule, SettingsModule, StartupModule, StorageModule, UpdaterModule],
    views: [MainView],
    windows: [MainWindow],
})
export class AppModule {
    private readonly signalBus = inject(SignalBus);
    private readonly auth = inject(AuthService);
    private readonly window = inject(MainWindow);

    async onInit() {
        this.window.register();

        app.on("activate", async () => {
            if (this.auth.isAuthorized()) {
                if (!this.window.window) {
                    this.window.register();
                    await this.window.open();
                } else {
                    this.window.show();
                }
            } else {
                this.signalBus.publish("user-logout");
            }
        });

        this.signalBus.subscribe("user-logged", async () => {
            this.logger.info("received signal user-logged");
            await new Promise((resolve) => setTimeout(resolve, 500));
            await this.window.open();
        });

        this.signalBus.subscribe("user-logout", async () => {
            this.logger.info("received signal user-logout");
            await new Promise((resolve) => setTimeout(resolve, 500));
            if (this.window) this.window.close();
        });
    }
}
