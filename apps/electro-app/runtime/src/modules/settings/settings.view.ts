import { View } from "@electro/common";
import { ViewProvider } from "@electro/runtime";

@View({
    source: "view:settings",
    access: [],
    signals: [],
})
export class SettingsView extends ViewProvider {}
