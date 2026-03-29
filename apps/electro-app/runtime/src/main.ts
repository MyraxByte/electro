import { AppKernel } from "@electrojs/runtime";
import { app } from "electron";
import { AppModule } from "./modules/app.module";

const kernel = AppKernel.create(AppModule, {});

if (!app.requestSingleInstanceLock()) {
    app.quit();
}

app.on("window-all-closed", () => process.platform !== "darwin" && app.quit());
app.on("before-quit", () => kernel.shutdown());

const electronReady = app.whenReady();

void (async () => {
    await kernel.initialize();
    await electronReady;
    await kernel.start();
})();
