import { AppKernel, createConsoleLogger } from "@electrojs/runtime";
import { app } from "electron";
import { AppModule } from "./modules/app.module";

const kernel = AppKernel.create(AppModule, {
    logger: createConsoleLogger(),
});

if (!app.requestSingleInstanceLock()) {
    app.quit();
}

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("before-quit", () => {
    void kernel.shutdown();
});

void app.whenReady().then(async () => {
    await kernel.start();
});
