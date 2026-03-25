import { AppKernel } from "@electrojs/runtime";
import { app } from "electron";
import { AppModule } from "./modules/app.module";

const kernel = AppKernel.create(AppModule, {});

if (!app.requestSingleInstanceLock()) {
    app.quit();
}

app.on("window-all-closed", () => process.platform !== "darwin" && app.quit());
app.on("before-quit", () => kernel.shutdown());

void app.whenReady().then(async () => {
    await kernel.start();
});
