import { Module } from "@electro/common";
import { SettingsModule } from "../settings/settings.module";

import { UpdaterService } from "./updater.service";
import { inject } from "@electro/runtime";

@Module({
    imports: [SettingsModule],
    providers: [UpdaterService],
    exports: [UpdaterService],
})
export class UpdaterModule {
    private updater = inject(UpdaterService);

    async onInit() {
        /**
         * Updater service
         * Register updater.
         */
        this.updater.register();
    }
}
