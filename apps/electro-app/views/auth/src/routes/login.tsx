import { createFileRoute } from "@tanstack/react-router";
// import { bridge } from "@electrojs/renderer";
import { delay } from "es-toolkit";
import { motion } from "framer-motion";
import { useState } from "react";

export const Route = createFileRoute("/login")({
    component: LoginScreen,
});

function LoginScreen() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
        setLoading(true);
        await delay(2000);
        setError(null);
        // await bridge.auth.login();
        setLoading(false);
    };

    return (
        <div className="flex flex-col items-center justify-center flex-1">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center gap-8"
            >
                {/* Brand: Logo + Text */}
                <div className="flex flex-col items-center gap-2.5">
                    {/* Dragon mascot logo */}
                    <motion.img
                        src={new URL("@/shared/assets/images/logo.svg", import.meta.url).href}
                        alt="Cordy App"
                        className="w-30 h-25.25 object-contain"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                        draggable={false}
                    />

                    {/* App name + tagline */}
                    <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-1">
                            <span className="text-xl font-brand font-semibold leading-[0.8] text-brand">Cordy</span>
                            <span className="text-xl font-brand font-semibold leading-[0.8] text-white">App</span>
                        </div>
                        <p className="text-xs font-ui text-text-muted/[.67]">Application for testing</p>
                    </div>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-65 p-3 bg-status-error/10 border border-status-error/20 rounded-card-sm text-status-error text-sm text-center font-ui"
                    >
                        {error}
                    </motion.div>
                )}

                {/* Login buttons */}
                <div className="flex flex-col items-center gap-2">
                    <button
                        type="button"
                        onClick={() => handleLogin()}
                        disabled={loading}
                        className="w-65 h-8 rounded-2xl py-2.5 px-8 bg-white text-black rounded-pill font-semibold text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                        Login
                    </button>
                </div>

                {loading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-1 text-text-muted">
                        <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }} className="text-sm font-ui">
                            Opening browser for login
                        </motion.span>
                        {[0, 0.2, 0.4].map((delay) => (
                            <motion.span key={delay} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.2, repeat: Infinity, delay }}>
                                .
                            </motion.span>
                        ))}
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}
