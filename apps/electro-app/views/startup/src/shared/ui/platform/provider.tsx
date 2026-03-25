import { createContext, useContext, useLayoutEffect, useMemo } from "react";
import type { Platform } from "../../lib/detect";
import { getPlatform } from "../../lib/detect";

const PlatformContext = createContext<Platform>("macos");

export function usePlatform(): Platform {
    return useContext(PlatformContext);
}

export function PlatformProvider({ children }: { children: React.ReactNode }) {
    const platform = useMemo(() => getPlatform(), []);

    useLayoutEffect(() => {
        document.documentElement.setAttribute("data-platform", platform);
    }, [platform]);

    return <PlatformContext.Provider value={platform}>{children}</PlatformContext.Provider>;
}
