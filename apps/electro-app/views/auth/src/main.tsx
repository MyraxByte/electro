import "@/shared/css/index.css";
import { queryClient } from "./shared/lib/query-client";
import { ErrorBoundary } from "./shared/ui/error-boundary";
import { PlatformProvider } from "./shared/ui/platform/provider";
import { ElectroRenderer } from "@electro/renderer";
import { QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import React from "react";
import ReactDOM from "react-dom/client";
import { routeTree } from "./routeTree.gen";

// Memory history (no URL bar in Electron)
const memoryHistory = createMemoryHistory({ initialEntries: ["/"] });

const router = createRouter({
    routeTree,
    history: memoryHistory,
});

// Type registration
declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}

const element = document.getElementById("root");
if (!element) throw new Error("Root element not found");

await ElectroRenderer.initialize(() => {
    ReactDOM.createRoot(element).render(
        <React.StrictMode>
            <ErrorBoundary>
                <QueryClientProvider client={queryClient}>
                    <PlatformProvider>
                        <RouterProvider router={router} />
                    </PlatformProvider>
                </QueryClientProvider>
            </ErrorBoundary>
        </React.StrictMode>,
    );
});
