import { View } from "@electro/common";
import { ViewProvider } from "@electro/runtime";
import { dialog, WebContentsView } from "electron/main";

@View({
    access: [],
    source: "view:auth",
})
export class AuthView extends ViewProvider {
    public appendView(view: WebContentsView) {
        this.contentView?.addChildView(view);
    }

    public resize(width: number, height: number) {
        this.contentView?.setBounds({ x: 0, y: 0, width, height });
    }

    public onRenderGone(callback: () => void) {
        this.webContents?.on("render-process-gone", (_event, details) => {
            if (details.reason === "clean-exit") return;

            const choice = dialog.showMessageBoxSync({
                type: "error",
                title: "CordyWatch — Renderer Crashed",
                message: `The renderer process ${details.reason === "killed" ? "was killed" : "crashed"}.`,
                detail: details.reason,
                buttons: ["Reload", "Quit"],
                defaultId: 0,
            });

            if (choice === 0) this.webContents?.reload();
            else callback();
        });
    }
}
