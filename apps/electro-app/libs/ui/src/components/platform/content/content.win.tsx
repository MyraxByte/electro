import { cn } from "../../../lib/utils";

interface ContentProps {
    children: React.ReactNode;
    className?: string;
}

export function WinContent({ children, className }: ContentProps) {
    return <div className={cn("text-white flex flex-col overflow-hidden rounded-2xl", className)}>{children}</div>;
}
