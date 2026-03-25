export interface UserState {
    lastUserId: string | null;
    users: Record<string, Record<string, unknown>>;
}
