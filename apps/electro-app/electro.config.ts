import { defineElectroConfig } from "@electro/config";

// Monorepo-style config: each sub-package is referenced by workspace name.
// The CLI resolves runtime and views by scanning the workspace for matching package.json names.
export default defineElectroConfig({
    // Points to the @emono/runtime workspace package, which contains runtime.config.ts
    runtime: "runtime",
    // Explicitly lists view packages; each must contain a view.config.ts
    views: ["@views/main", "@views/settings", "@views/auth", "@views/startup"],
});
