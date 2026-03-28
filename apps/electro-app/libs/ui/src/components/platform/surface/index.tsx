import { usePlatform } from "../provider";
import { MacSurface } from "./surface.mac";
import { WinSurface } from "./surface.win";

interface SurfaceProps {
    children: React.ReactNode;
    className?: string;
}

export function Surface({ children, className }: SurfaceProps) {
    const platform = usePlatform();
    if (platform === "macos") return <MacSurface className={className}>{children}</MacSurface>;
    return <WinSurface className={className}>{children}</WinSurface>;
}
