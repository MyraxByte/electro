import { cn } from "../../../lib/utils";

interface ContentProps {
    children: React.ReactNode;
    className?: string;
}

export function MacContent({ children, className }: ContentProps) {
    return (
        <div className={cn("text-white flex flex-col flex-1 overflow-hidden rounded-2xl bg-[#121214] border border-(--content-border)", className)}>
            {children}
        </div>
    );
}
