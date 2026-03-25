import { View } from "@electrojs/common";
import { ViewProvider } from "@electrojs/runtime";
import { WebContentsView } from "electron/main";

@View({
    access: ["settings:getVersion"],
    signals: ["updater:status-changed", "updater:download-progress"],
    source: "view:startup",
})
export class StartupView extends ViewProvider {
    public appendView(view: WebContentsView) {
        this.contentView?.addChildView(view);
    }
}
