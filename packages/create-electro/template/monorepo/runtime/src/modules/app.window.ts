import { Window } from "@electrojs/common";
import { inject, WindowProvider } from "@electrojs/runtime";
import { MainView } from "./app.view";

@Window({
    id: "main",
    configuration: {
        width: 1200,
        height: 760,
        minWidth: 960,
        minHeight: 640,
        show: false,
        backgroundColor: "#0b1020",
    },
})
export class MainWindow extends WindowProvider {
    private readonly view = inject(MainView);

    public onResize() {
        const bounds = this.window?.getBounds();
        this.view.resize(bounds?.width ?? 0, bounds?.height ?? 0);
    }

    async open() {
        await this.view.load();
        this.onResize();
        this.window?.on("resize", () => this.onResize());
        this.view.setBackgroundColor("#00000000");

        this.mount(this.view);
        this.show();
    }
}
}
