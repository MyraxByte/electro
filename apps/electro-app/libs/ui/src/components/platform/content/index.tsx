import { usePlatform } from "../provider";
import { MacContent } from "./content.mac";
import { WinContent } from "./content.win";

interface ContentProps {
    children: React.ReactNode;
    className?: string;
}

export function Content({ children, className }: ContentProps) {
    const platform = usePlatform();
    if (platform === "macos") return <MacContent className={className}>{children}</MacContent>;
    return <WinContent className={className}>{children}</WinContent>;
}
