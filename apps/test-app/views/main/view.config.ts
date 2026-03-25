import { defineViewConfig } from "@electro/config";
import react from "@vitejs/plugin-react";

export default defineViewConfig({
    viewId: "main",
    entry: "./index.html",
    plugins: [react()],
});
