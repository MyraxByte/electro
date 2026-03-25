import { Module } from "@electrojs/common";
import { SettingsModule } from "../settings/settings.module";

import { app } from "electron";
import { SettingsService } from "../settings/settings.service";
import { StorageService } from "./storage.service";
import { inject } from "@electrojs/runtime";

@Module({
    imports: [SettingsModule],
    providers: [StorageService],
    exports: [StorageService],
})
export class StorageModule {
    private readonly settings = inject(SettingsService);
    private readonly storage = inject(StorageService);

    onInit() {
        /**
         * Initialize storage services
         * This will be called when the app is ready to start.
         */
        if (this.settings.isTestInstance()) {
            app.name = `${app.name}-test-${this.settings.getTestInstanceId()}`;
            app.setPath("userData", `${app.getPath("userData")}-test-${this.settings.getTestInstanceId()}`);
        }
    }
}
