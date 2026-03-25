export interface SerializedRequest {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
}

export interface SerializedResponse {
    status: number;
    body: string;
    headers: Record<string, string>;
}
