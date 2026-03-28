import "@libs/ui/assets/css/index.css";
import { PlatformProvider } from "@libs/ui";
import { Surface } from "@libs/ui";
import { ElectroRenderer } from "@electrojs/renderer";
import React from "react";
import ReactDOM from "react-dom/client";
import { SplashScreen } from "./splash-screen";

ElectroRenderer.initialize(() => {
    const element = document.getElementById("root");
    if (!element) throw new Error("Root element not found");
    ReactDOM.createRoot(element).render(
        <React.StrictMode>
            <PlatformProvider>
                <Surface>
                    <SplashScreen />
                </Surface>
            </PlatformProvider>
        </React.StrictMode>,
    );
})
    .then(() => console.log("Electron renderer initialized"))
    .catch((e) => console.error(e));
