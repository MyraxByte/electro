import { Injectable } from "@electro/common";
import { SettingsService } from "../settings/settings.service";
import { inject } from "@electro/runtime";

@Injectable()
export class DeeplinkerService {
    getProtocol() {
        const settings = inject(SettingsService);

        const base = settings.isDev() ? "cordywatchdev" : "cordywatch";
        return settings.isTestInstance() ? `${base}-test${settings.getTestInstanceId()}` : base;
    }

    parseUrl(url: string) {
        try {
            const parsed = new URL(url);
            this.logger.debug("parsed deep link", { url: parsed.toString() });
            return parsed;
        } catch {
            this.logger.warn("failed to parse deep link", { url });
        }
    }
}
