import { Module } from "@electro/common";
import { app } from "electron";
import { resolve } from "node:path";
import { SettingsModule } from "../settings/settings.module";
import { SettingsService } from "../settings/settings.service";
import { DeeplinkerService } from "./deeplinker.service";
import { inject } from "@electro/runtime";

@Module({
    imports: [SettingsModule],
    providers: [DeeplinkerService],
    exports: [DeeplinkerService],
})
export class DeeplinkerModule {
    private readonly settings = inject(SettingsService);
    private readonly deeplinker = inject(DeeplinkerService);

    onInit() {
        /**
         * Set up deep linking.
         * This will be called by the main window when it's ready to handle deep linking URLs.
         */
        if (this.settings.isDev() && process.argv.length >= 2) {
            app.setAsDefaultProtocolClient(this.deeplinker.getProtocol(), process.execPath, [resolve(process.argv[1] ?? "")]);
        } else {
            app.setAsDefaultProtocolClient(this.deeplinker.getProtocol());
        }
    }
}
