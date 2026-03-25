import { View } from "@electrojs/common";
import { ViewProvider } from "@electrojs/runtime";

@View({
    source: "view:settings",
    access: [],
    signals: [],
})
export class SettingsView extends ViewProvider {}
