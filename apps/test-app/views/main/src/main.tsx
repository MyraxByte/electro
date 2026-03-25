import { ElectroRenderer } from "@electro/renderer";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app";

await ElectroRenderer.initialize(() => {
    ReactDOM.createRoot(document.getElementById("root")!).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>,
    );
});
