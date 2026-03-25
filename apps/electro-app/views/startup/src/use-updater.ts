import { useEffect } from "react";
import { signals } from "@electrojs/renderer";
import { useUpdater } from "./updater-store";

/**
 * Subscribes to updater events via EventBridge and updates the zustand store.
 * Events are pushed from the main process when autoUpdater status changes.
 */
export function useUpdaterEvents() {
    const { setStatus, setProgress, setError } = useUpdater();

    useEffect(() => {
        const statusSubscription = signals.subscribe("updater:status-changed", (payload) => {
            console.log("Status changed:", payload);
            setStatus(payload.status, payload.version);
            if (payload.error) setError(payload.error);
            if (typeof payload.progress === "number") setProgress(payload.progress);
        });

        const progressSubscription = signals.subscribe("updater:download-progress", (payload) => {
            console.log("Download progress:", payload);
            setProgress(payload.percent);
        });

        return () => {
            statusSubscription.unsubscribe();
            progressSubscription.unsubscribe();
        };
    }, [setStatus, setProgress, setError]);
}
