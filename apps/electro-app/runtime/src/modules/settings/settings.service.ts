import { Injectable, query } from "@electrojs/common";
import { is } from "@electron-toolkit/utils";
import { app } from "electron";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

@Injectable()
export class SettingsService {
    @query()
    isDev() {
        return is.dev;
    }

    @query()
    getVersion() {
        return app.getVersion();
    }

    isTestInstance() {
        const testInstanceArg = process.argv.find((a) => a.startsWith("--test-instance="));
        return Boolean(process.env.TEST_INSTANCE || (testInstanceArg ? testInstanceArg.split("=")[1] : null));
    }

    getTestInstanceId() {
        return this.isTestInstance() ? Number(process.env.TEST_INSTANCE) : null;
    }

    getApiUrl() {
        return process.env.apiUrl || "https://api.cordy-watch.orb.local";
    }

    verify() {
        if (this.isDev()) return { valid: true, failures: [] };

        const appPath = app.getAppPath();
        const checksumsPath = join(appPath, "checksums.json");

        if (!existsSync(checksumsPath)) return { valid: true, failures: [] };

        let checksums: Record<string, string>;
        try {
            checksums = JSON.parse(readFileSync(checksumsPath, "utf-8"));
        } catch {
            return { valid: false, failures: ["checksums.json: invalid format"] };
        }

        const failures: string[] = [];

        for (const [file, expectedHash] of Object.entries(checksums)) {
            const filePath = join(appPath, file);

            if (!existsSync(filePath)) {
                failures.push(`${file}: missing`);
                continue;
            }

            const content = readFileSync(filePath);
            const actualHash = `sha256-${createHash("sha256").update(content).digest("hex")}`;

            if (actualHash !== expectedHash) {
                failures.push(`${file}: hash mismatch`);
            }
        }

        return { valid: failures.length === 0, failures };
    }
}
