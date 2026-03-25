import { Module } from "@electrojs/common";
import { app } from "electron";
import { SettingsService } from "./settings.service";
import { inject } from "@electrojs/runtime";
import { SettingsView } from "./settings.view";

@Module({
    providers: [SettingsService],
    exports: [SettingsService],
    views: [SettingsView],
})
export class SettingsModule {
    async onInit() {
        /**
         * Verify app integrity.
         * If verification fails and app is not in development mode, quit the app to prevent potential security risks.
         */
        const service = inject(SettingsService);
        const verification = service.verify();
        if (!verification.valid && !service.isDev()) {
            app.quit();
        }
    }
}
