import { View } from "@electrojs/common";
import { ViewProvider } from "@electrojs/runtime";

@View({
    access: [
        "app:getShellState",
        "app:minimizeWindow",
        "app:toggleMaximizeWindow",
        "app:closeWindow",
        "app:openDocumentation",
        "notes:createNote",
        "notes:getNotes",
        "notes:deleteNote",
    ],
    source: "view:main",
    configuration: {},
})
export class MainView extends ViewProvider {
    public resize(width: number, height: number) {
        this.contentView?.setBounds({ x: 0, y: 0, width, height });
    }
}
