import { Window } from "@electrojs/common";
import { inject, WindowProvider } from "@electrojs/runtime";
import { shell } from "electron";
import { MainView } from "./app.view";
import { app, Menu } from "electron/main";

const isMacOS = process.platform === "darwin";
const isWindows = process.platform === "win32";

@Window({
    id: "main",
    configuration: {
        width: 1360,
        height: 860,
        minWidth: 1120,
        minHeight: 720,
        show: false,
        frame: false,
        transparent: true,
        visualEffectState: "active",
        backgroundColor: "#00000000",
        ...(isMacOS && { vibrancy: "fullscreen-ui" }),
        ...(isWindows && { backgroundMaterial: "mica" }),
    },
})
export class MainWindow extends WindowProvider {
    private readonly view = inject(MainView);

    public register() {
        this.create();
        this.window?.on("resize", () => this.onResize());
    }

    public onResize() {
        const bounds = this.window?.getBounds();
        this.view.resize(bounds?.width ?? 0, bounds?.height ?? 0);
    }

    async open() {
        await this.view.load();
        this.onResize();
        this.view.setBackgroundColor("#00000000");
        if (isMacOS) {
            this.view.setWindowButtonVisibility(false);
        }

        this.mount(this.view);
        this.view.webContents?.setWindowOpenHandler((details) => {
            void shell.openExternal(details.url);
            return { action: "deny" };
        });
        this.show();
    }
}
