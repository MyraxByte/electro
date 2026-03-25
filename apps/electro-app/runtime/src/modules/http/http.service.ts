import { Injectable } from "@electro/common";
import { join } from "node:path";
import { SettingsService } from "../settings/settings.service";
import { StorageService } from "../storage/storage.service";
import { SerializedRequest, SerializedResponse } from "./http.interface";
import { inject } from "@electro/runtime";

@Injectable()
export class HttpService {
    private settings = inject(SettingsService);
    private storage = inject(StorageService);

    private refreshPromise: Promise<string | null> | null = null;
    private expiredCallback: (() => void) | null = null;

    onSessionExpired(callback: () => void) {
        this.expiredCallback = callback;
    }

    /** Validate stored session — used by module initialize and auth callback. */
    async getCurrentUser(): Promise<unknown> {
        const result = await this.proxyFetch("/v1/user/me", { method: "GET" });
        if (result.status !== 200) throw new Error("Failed to get user profile");
        return JSON.parse(result.body);
    }

    /**
     * IPC fetch proxy — renderer's Eden Treaty client routes requests here.
     * Injects auth token, forwards to server, handles 401 refresh + retry.
     */
    async proxyFetch(url: string, init: SerializedRequest): Promise<SerializedResponse> {
        const realUrl = url.startsWith("http://") || url.startsWith("https://") ? url : join(this.settings.getApiUrl(), url);

        const doFetch = async (headers: Record<string, string>) => {
            const res = await fetch(realUrl, {
                method: init.method || "GET",
                headers,
                body: init.body,
            });
            return {
                status: res.status,
                body: await res.text(),
                headers: Object.fromEntries(res.headers.entries()),
            };
        };

        const headers: Record<string, string> = { ...init.headers };
        const token = this.storage.getAccessToken();
        if (token) headers.Authorization = `Bearer ${token}`;

        try {
            let result = await doFetch(headers);

            if (result.status === 401) {
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    const newToken = this.storage.getAccessToken();
                    if (newToken) headers.Authorization = `Bearer ${newToken}`;
                    result = await doFetch(headers);
                }
            }

            return result;
        } catch {
            return { status: 0, body: '{"error":"Network error"}', headers: {} };
        }
    }

    async refreshToken(): Promise<boolean> {
        if (this.refreshPromise) return !!(await this.refreshPromise);

        this.refreshPromise = (async () => {
            const refreshToken = this.storage.getAccessToken();
            if (!refreshToken) return null;

            try {
                const res = await fetch(`${this.settings.getApiUrl()}/v1/auth/refresh`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ refreshToken }),
                });

                if (!res.ok) {
                    this.storage.clearTokens();
                    this.expiredCallback?.();
                    return null;
                }

                const { accessToken, refreshToken: newRefreshToken } = await res.json();
                this.storage.setAccessToken(accessToken);
                if (newRefreshToken) this.storage.setRefreshToken(newRefreshToken);

                return accessToken;
            } catch {
                return null;
            }
        })();

        try {
            return !!(await this.refreshPromise);
        } finally {
            this.refreshPromise = null;
        }
    }
}
