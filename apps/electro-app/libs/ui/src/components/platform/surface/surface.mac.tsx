import { cn } from "../../../lib/utils";

interface SurfaceProps {
    children: React.ReactNode;
    className?: string;
}

export function MacSurface({ children, className }: SurfaceProps) {
    return (
        <div
            className={cn("min-h-screen h-screen text-white flex flex-col overflow-hidden rounded-2xl", className)}
            style={{
                background: "var(--surface-bg)",
            }}
        >
            {children}
        </div>
    );
}
