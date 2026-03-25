import logoSrc from "@/shared/assets/images/logo.svg";
import { motion } from "framer-motion";
import { useUpdater } from "./updater-store";
import { useUpdaterEvents } from "./use-updater";
import { useVersion } from "./use-version";

function getStatusText(status: string): string {
    switch (status) {
        case "downloading":
            return "Downloading update...";
        case "downloaded":
            return "Update ready! Restarting...";
        case "error":
            return "Checking for updates...";
        default:
            return "Checking for updates...";
    }
}

export function SplashScreen() {
    useUpdaterEvents();
    const { status, progress } = useUpdater();
    const version = useVersion();

    const statusText = getStatusText(status);
    const isDownloading = status === "downloading";
    const clampedProgress = Math.min(100, Math.max(0, progress));

    return (
        <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                {/* Dragon mascot logo */}
                <motion.img
                    src={logoSrc}
                    alt="Cordy App"
                    className="w-30 h-25.25 object-contain"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    draggable={false}
                />

                {/* Status text */}
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-sm font-ui text-gray-200/75">
                    {statusText}
                </motion.p>

                {/* Progress bar + version */}
                <motion.div className="flex flex-col items-center gap-1.5 w-45" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                    {/* Track */}
                    <div className="w-full h-1 rounded-[3px] bg-white/10 overflow-hidden">
                        {isDownloading ? (
                            <motion.div
                                className="h-full rounded-[3px]"
                                initial={{ width: "0%" }}
                                animate={{ width: `${clampedProgress}%` }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                            />
                        ) : (
                            <motion.div
                                className="h-full rounded-[3px]"
                                style={{ background: "linear-gradient(90deg, #c82634, #c82634)" }}
                                animate={{
                                    width: ["0%", "40%", "0%"],
                                    marginLeft: ["0%", "30%", "100%"],
                                }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            />
                        )}
                    </div>

                    {/* Version */}
                    {version && <span className="text-[10px] font-mono text-text-disabled">v{version}</span>}
                </motion.div>
            </div>
        </div>
    );
}
