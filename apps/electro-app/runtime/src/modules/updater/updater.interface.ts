export interface UpdaterStatusChangedPayload {
    status: "idle" | "checking" | "available" | "downloading" | "downloaded" | "error";
    version?: string;
    progress?: number;
    error?: string;
}

export interface UpdaterDownloadProgressPayload {
    percent: number;
    bytesPerSecond: number;
    transferred: number;
    total: number;
}
