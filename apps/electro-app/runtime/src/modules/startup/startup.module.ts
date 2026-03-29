import { Module } from "@electrojs/common";
import { app } from "electron";
import { inject, SignalBus } from "@electrojs/runtime";
import { StartupWindow } from "./startup.window";
import { StartupView } from "./startup.view";
import { SettingsModule } from "../settings/settings.module";
import { SettingsService } from "../settings/settings.service";
import { UpdaterModule } from "../updater/updater.module";
import { UpdaterService } from "../updater/updater.service";

@Module({
    imports: [SettingsModule, UpdaterModule],
    providers: [],
    exports: [],
    views: [StartupView],
    windows: [StartupWindow],
})
export class StartupModule {
    private readonly settings = inject(SettingsService);
    private readonly window = inject(StartupWindow);
    private readonly updater = inject(UpdaterService);
    private readonly signalBus = inject(SignalBus);

    async onInit() {
        /**
         * Verify app integrity.
         * If verification fails and app is not in development mode, quit the app to prevent potential security risks.
         */
        const verification = this.settings.verify();
        if (!verification.valid && !this.settings.isDev()) {
            app.quit();
        }

        /**
         * Subscribe to signal bus events.
         */
        this.signalBus.subscribe("user-logged", async () => {
            this.logger.info("received signal user-logged");
            this.window.close();
        });

        this.signalBus.subscribe("user-logout", async () => {
            this.logger.info("received signal user-logout");
            this.window.close();
        });
    }

    async onStart() {
        this.window.create();
        await this.window.open();
    }

    async onReady() {
        await this.updater.check();
    }
}
