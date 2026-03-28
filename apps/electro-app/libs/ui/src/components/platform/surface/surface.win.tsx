import { cn } from "../../../lib/utils";

interface SurfaceProps {
    children: React.ReactNode;
    className?: string;
}

export function WinSurface({ children, className }: SurfaceProps) {
    return (
        <div
            className={cn("h-screen text-white flex flex-col overflow-hidden rounded-2xl", className)}
            style={{
                background: "var(--surface-bg)",
                // borderColor: 'var(--surface-border)',
            }}
        >
            {children}
        </div>
    );
}
