import { Window } from "@electrojs/common";
import { inject, WindowProvider } from "@electrojs/runtime";
import { shell } from "electron";
import { MainView } from "./app.view";

const isMacOS = process.platform === "darwin";
const isWindows = process.platform === "win32";

@Window({
    id: "main",
    configuration: {
        width: 1280,
        height: 800,
        minWidth: 1280,
        minHeight: 800,
        show: false,
        frame: false,
        titleBarStyle: "hidden",
        trafficLightPosition: { x: 12, y: 12 },
        visualEffectState: "active",
        transparent: true,
        ...(isMacOS && { vibrancy: "fullscreen-ui" }),
        ...(isWindows && { backgroundMaterial: "mica" }),
    },
})
export class MainWindow extends WindowProvider {
    private readonly view = inject(MainView);

    async register() {
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

        this.mount(this.view);
        this.view.onRenderGone(() => {
            this.window?.close();
        });

        this.view.webContents?.setWindowOpenHandler((details) => {
            void shell.openExternal(details.url);
            return { action: "deny" };
        });

        this.window?.show();
    }
}
