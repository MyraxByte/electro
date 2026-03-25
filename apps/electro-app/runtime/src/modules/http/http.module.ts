import { Module } from "@electro/common";
import { SettingsModule } from "../settings/settings.module";
import { StorageModule } from "../storage/storage.module";
import { HttpService } from "./http.service";

@Module({
    imports: [SettingsModule, StorageModule],
    providers: [HttpService],
    exports: [HttpService],
})
export class HttpModule {}
