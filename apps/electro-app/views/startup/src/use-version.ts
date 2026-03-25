import { useEffect, useState } from "react";
import { bridge } from "@electrojs/renderer";

/** Fetches the app version from the main process via IPC. */
export function useVersion(): string {
    const [version, setVersion] = useState("");

    useEffect(() => {
        void bridge.settings.getVersion().then((v) => {
            setVersion(v);
        });
    }, []);

    return version;
}
