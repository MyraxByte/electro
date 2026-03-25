import { command, Injectable, query } from "@electro/common";
import { shell } from "electron";
import { join } from "node:path";
import { SettingsService } from "../settings/settings.service";
import { DeeplinkerService } from "../deeplinker/deeplinker.service";
import { HttpService } from "../http/http.service";
import { StorageService } from "../storage/storage.service";
import { inject, SignalBus } from "@electro/runtime";

@Injectable()
export class AuthService {
    private config = inject(SettingsService);
    private storage = inject(StorageService);
    private http = inject(HttpService);
    private deeplinker = inject(DeeplinkerService);
    private signalBus = inject(SignalBus);

    isAuthorized() {
        return !!this.storage.hasTokens() && !!this.storage.getLastUserId();
    }

    @command()
    login(provider: "google" | "discord") {
        const callbackUrl = encodeURIComponent(`${this.deeplinker.getProtocol()}://auth/callback`);
        const url = join(this.config.getApiUrl(), `/v1/auth/${provider}?redirect=${callbackUrl}`);
        void shell.openExternal(url);
    }

    @command()
    async logout() {
        const storage = inject(StorageService);
        storage.clearTokens();
        storage.setLastUserId(null);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        this.signalBus.publish("user-logout");
    }

    @query()
    async getCurrentUser(): Promise<unknown> {
        return await this.http.getCurrentUser();
    }

    async authCallback(url: URL): Promise<void> {
        const accessToken = url.searchParams.get("accessToken");
        const refreshToken = url.searchParams.get("refreshToken");
        const isNew = url.searchParams.get("isNew") === "true";

        if (!accessToken || !refreshToken) return;
        this.storage.setTokens(accessToken, refreshToken);
        try {
            const user = await this.getCurrentUser();
            this.signalBus.publish("user-logged", { user, isNew });
        } catch {
            this.signalBus.publish("error", { message: "Failed to load profile after login" });
        }
    }
}
