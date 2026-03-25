import { Injectable } from "@electrojs/common";
import * as electronUpdater from "electron-updater";
import { SettingsService } from "../settings/settings.service";
import type { UpdaterDownloadProgressPayload, UpdaterStatusChangedPayload } from "./updater.interface";
import { inject, SignalBus } from "@electrojs/runtime";

@Injectable()
export class UpdaterService {
    private signalBus = inject(SignalBus);

    register() {
        electronUpdater.autoUpdater.autoDownload = false;
        electronUpdater.autoUpdater.autoInstallOnAppQuit = true;

        electronUpdater.autoUpdater.on("checking-for-update", () => {
            this.setStatus({ status: "checking" });
        });

        electronUpdater.autoUpdater.on("update-available", async (info: electronUpdater.UpdateInfo) => {
            this.setStatus({ status: "available", version: info.version });
            await this.download();
        });

        electronUpdater.autoUpdater.on("update-not-available", () => {
            this.setStatus({ status: "idle" });
        });

        electronUpdater.autoUpdater.on("download-progress", (progress: electronUpdater.ProgressInfo) => {
            this.setStatus({ status: "downloading", progress: progress.percent });
            this.setDownloadProgress({
                percent: progress.percent,
                bytesPerSecond: progress.bytesPerSecond,
                transferred: progress.transferred,
                total: progress.total,
            });
        });

        electronUpdater.autoUpdater.on("update-downloaded", async (info: electronUpdater.UpdateInfo) => {
            this.setStatus({ status: "downloaded", version: info.version });
        });

        electronUpdater.autoUpdater.on("error", (error: Error) => {
            this.setStatus({ status: "error", error: error.message });
        });

        electronUpdater.autoUpdater.on("update-downloaded", async (info: electronUpdater.UpdateInfo) => {
            this.logger.info("update downloaded", { version: info.version });
            this.install();
        });
    }

    async check(): Promise<{ available: boolean; version?: string }> {
        try {
            const config = inject(SettingsService);
            const result = await electronUpdater.autoUpdater.checkForUpdates();
            if (!result?.updateInfo) return { available: false };
            const available = result.updateInfo.version !== config.getVersion();
            return { available, version: result.updateInfo.version };
        } catch {
            return { available: false };
        }
    }

    async download(): Promise<boolean> {
        try {
            await electronUpdater.autoUpdater.downloadUpdate();
            return true;
        } catch {
            return false;
        }
    }

    install() {
        electronUpdater.autoUpdater.quitAndInstall(false, true);
    }

    setStatus(payload: UpdaterStatusChangedPayload): void {
        this.logger.info(`status ${payload.status}`);
        this.signalBus.publish("updater:status-changed", payload);
    }

    setDownloadProgress(payload: UpdaterDownloadProgressPayload): void {
        this.signalBus.publish("updater:download-progress", {
            percent: payload.percent,
            bytesPerSecond: payload.bytesPerSecond,
            transferred: payload.transferred,
            total: payload.total,
        });
    }
}
