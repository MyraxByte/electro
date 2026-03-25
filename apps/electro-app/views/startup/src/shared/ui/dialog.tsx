import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect } from "react";
import IconDismiss from "~icons/hugeicons/cancel-01";
import { cn } from "@/shared/lib/utils";

interface DialogProps {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
    className?: string;
}

export function Dialog({ open, onClose, children, className }: DialogProps) {
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        },
        [onClose],
    );

    useEffect(() => {
        if (open) {
            document.addEventListener("keydown", handleKeyDown);
            return () => document.removeEventListener("keydown", handleKeyDown);
        }
    }, [open, handleKeyDown]);

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className={cn("relative z-10 w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800/80 shadow-2xl", className)}
                    >
                        {children}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

interface DialogHeaderProps {
    children: React.ReactNode;
    onClose?: () => void;
}

export function DialogHeader({ children, onClose }: DialogHeaderProps) {
    return (
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <h2 className="text-lg font-semibold">{children}</h2>
            {onClose && (
                <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors"
                >
                    <IconDismiss className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}

export function DialogBody({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={cn("px-5 pb-5", className)}>{children}</div>;
}
