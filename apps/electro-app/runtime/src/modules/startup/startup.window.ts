import { StartupView } from "@/modules/startup/startup.view";
import { Window } from "@electrojs/common";
import { inject, WindowProvider } from "@electrojs/runtime";

const isMacOS = process.platform === "darwin";
const isWindows = process.platform === "win32";

@Window({
    id: "splash",
    configuration: {
        width: 400,
        height: 400,
        minWidth: 400,
        minHeight: 400,
        show: false,
        frame: false,
        resizable: false,
        titleBarStyle: "default",
        visualEffectState: "active",
        transparent: true,
        ...(isMacOS && { vibrancy: "sidebar", darkTheme: true }),
        ...(isWindows && { backgroundMaterial: "mica" }),
    },
})
export class StartupWindow extends WindowProvider {
    private readonly view = inject(StartupView);

    async open() {
        await this.view.load();

        this.mount(this.view);
        this.view.setBackgroundColor("#00000000");
        this.view.setBounds({ x: 0, y: 0, width: 400, height: 400 });
        this.view.webContents?.openDevTools();
        this.window?.show();
    }
}
