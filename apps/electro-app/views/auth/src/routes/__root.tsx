import { Surface } from "@/shared/ui/platform/surface";
import { TitleBar } from "@/shared/ui/platform/titlebar";
import { createRootRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";

const screenTransition = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0 },
    transition: { duration: 0.25, ease: "easeOut" as const },
};

function RootLayout() {
    const pathname = useRouterState({ select: (s) => s.location.pathname });

    return (
        <Surface>
            <TitleBar />
            <div className={"text-white flex flex-col flex-1 m-1.5 mt-0"}>
                <AnimatePresence mode="wait">
                    <motion.div key={pathname} className="flex-1 flex flex-col overflow-hidden" {...screenTransition}>
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </div>
        </Surface>
    );
}

export const Route = createRootRoute({
    component: RootLayout,
});
