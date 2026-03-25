import { Module } from "@electro/common";
import { inject, SignalBus } from "@electro/runtime";
import { app } from "electron";
import { SettingsModule } from "../settings/settings.module";
import { DeeplinkerModule } from "../deeplinker/deeplinker.module";
import { DeeplinkerService } from "../deeplinker/deeplinker.service";
import { HttpModule } from "../http/http.module";
import { HttpService } from "../http/http.service";
import { StorageModule } from "../storage/storage.module";
import { AuthService } from "./auth.service";
import { AuthWindow } from "@/modules/auth/auth.window";
import { AuthView } from "./auth.view";

@Module({
    imports: [SettingsModule, DeeplinkerModule, HttpModule, StorageModule],
    providers: [AuthService],
    exports: [AuthService],
    views: [AuthView],
    windows: [AuthWindow],
})
export class AuthModule {
    private readonly deeplinker = inject(DeeplinkerService);
    private readonly auth = inject(AuthService);
    private readonly http = inject(HttpService);
    private readonly signalBus = inject(SignalBus);
    private readonly window = inject(AuthWindow);

    async onInit() {
        app.on("open-url", async (event, url) => {
            event.preventDefault();
            const parsed = this.deeplinker.parseUrl(url);
            if (!parsed) return;

            if (parsed.hostname === "auth" && parsed.pathname === "/callback") {
                await this.auth.authCallback(parsed);
            }
        });

        app.on("second-instance", async (event, argv) => {
            event.preventDefault();
            const url = argv.find((arg) => arg.startsWith(`${this.deeplinker.getProtocol()}://`));
            if (!url) return;

            const parsed = this.deeplinker.parseUrl(url);
            if (!parsed) return;

            if (parsed.hostname === "auth" && parsed.pathname === "/callback") {
                await this.auth.authCallback(parsed);
            }
        });

        this.http.onSessionExpired(() => {
            this.signalBus.publish("user-logout");
        });

        this.signalBus.subscribe("user-logged", async () => {
            this.logger.info("received signal user-logged");
            this.window.close();
        });

        this.signalBus.subscribe("user-logout", async () => {
            this.logger.info("received signal user-logout");
            await new Promise((resolve) => setTimeout(resolve, 500));

            if (!this.window.window) {
                this.window.register();
                await this.window.open();
            } else {
                this.window.show();
            }
        });
    }

    async onReady() {
        this.logger.info("checking auth session");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        if (!this.auth.isAuthorized()) return this.signalBus.publish("user-logout");

        try {
            const user = await this.auth.getCurrentUser();
            this.signalBus.publish("user-logged", { user, isNew: false });
        } catch {
            this.signalBus.publish("user-logout");
        }
    }
}
