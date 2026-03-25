import { create } from "zustand";

interface UpdateState {
    status: "idle" | "checking" | "available" | "downloading" | "downloaded" | "error";
    version: string | null;
    progress: number;
    error: string | null;
    dismissed: boolean;

    setStatus: (status: UpdateState["status"], version?: string) => void;
    setProgress: (progress: number) => void;
    setError: (error: string) => void;
    dismiss: () => void;
    reset: () => void;
}

export const useUpdater = create<UpdateState>((set) => ({
    status: "idle",
    version: null,
    progress: 0,
    error: null,
    dismissed: false,

    setStatus: (status, version) =>
        set({
            status,
            ...(version ? { version, dismissed: false } : {}),
            ...(status !== "error" ? { error: null } : {}),
        }),
    setProgress: (progress) => set({ progress }),
    setError: (error) => set({ status: "error", error }),
    dismiss: () => set({ dismissed: true }),
    reset: () => set({ status: "idle", version: null, progress: 0, error: null, dismissed: false }),
}));
