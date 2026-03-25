export type AuthErrorPayload = {
    message: string;
};

export type AuthUserLoggedPayload = {
    user: any;
    isNew: boolean;
};

export type AuthUserLogoutPayload = unknown;
