import { Injectable } from "@electrojs/common";
import Store from "electron-store";
import { UserState } from "./store.interface";

@Injectable()
export class StorageService {
    private state = new Store<UserState>({
        name: "user-state",
        defaults: {
            lastUserId: null,
            users: {},
        },
    });

    getLastUserId(): string | null {
        return this.state.get("lastUserId");
    }

    setLastUserId(userId: string | null): void {
        this.state.set("lastUserId", userId);
    }

    setTokens(access: string, refresh: string): void {
        this.setAccessToken(access);
        this.setRefreshToken(refresh);
    }

    clearTokens(): void {
        const userId = this.state.get("lastUserId");
        if (!userId) throw new Error("No user ID set in store");
        this.setAccessToken(null);
        this.setRefreshToken(null);
    }

    hasTokens(): boolean {
        const accessToken = this.getAccessToken();
        return !!accessToken;
    }

    getTokens(): { accessToken: string | null; refreshToken: string | null } {
        return {
            accessToken: this.getAccessToken(),
            refreshToken: this.getRefreshToken(),
        };
    }

    getAccessToken(): string | null {
        const userId = this.state.get("lastUserId");
        if (!userId) return null;
        return this.get(userId, "accessToken") as string | null;
    }

    setAccessToken(token: string | null): void {
        const userId = this.state.get("lastUserId");
        if (!userId) throw new Error("No user ID set in store");
        this.set(userId, "accessToken", token);
    }

    getRefreshToken(): string | null {
        const userId = this.state.get("lastUserId");
        if (!userId) return null;
        return this.get(userId, "refreshToken") as string | null;
    }

    setRefreshToken(token: string | null): void {
        const userId = this.state.get("lastUserId");
        if (!userId) throw new Error("No user ID set in store");
        this.set(userId, "refreshToken", token);
    }

    get(userId: string, key: string): unknown {
        return this.state.get(`users.${userId}.${key}`);
    }

    set(userId: string, key: string, value: unknown): void {
        this.state.set(`users.${userId}.${key}`, value);
    }

    clear(userId: string): void {
        const users = this.state.get("users");
        delete users[userId];
        this.state.set("users", users);
    }
}
