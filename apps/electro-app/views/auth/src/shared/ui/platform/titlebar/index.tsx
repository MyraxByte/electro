import { usePlatform } from "../provider";
import { MacTitleBar } from "./titlebar.mac";
import { WinTitleBar } from "./titlebar.win";

export function TitleBar() {
    const platform = usePlatform();
    if (platform === "macos") return <MacTitleBar />;
    return <WinTitleBar />;
}
