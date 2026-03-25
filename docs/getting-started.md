# Getting Started

This guide documents the supported Electro setup: a monorepo-style app workspace with one runtime package and one package per renderer view.

Electro is no longer documented as a single-repo auto-discovery framework.

Start with:

```bash
npm create electro@latest my-app
cd my-app
pnpm install
pnpm run dev
```

---

## Workspace Layout

```txt
my-app/
├── electro.config.ts
├── package.json
├── pnpm-workspace.yaml
├── runtime/
│   ├── package.json
│   ├── runtime.config.ts
│   ├── electro-env.d.ts
│   └── src/
│       ├── main.ts
│       └── modules/
│           ├── app.module.ts
│           ├── app.view.ts
│           └── app.window.ts
└── views/
    ├── main/
    │   ├── package.json
    │   ├── view.config.ts
    │   ├── electro-env.d.ts
    │   ├── index.html
    │   └── src/
    │       └── main.tsx
    └── settings/
```

Generated internals go to `.electro/generated`. Authoring types go to package-local `electro-env.d.ts`.

---

## 1. Workspace Config

```yaml
# pnpm-workspace.yaml
packages:
    - "runtime"
    - "views/*"
    - "packages/*"
```

`packages/*` is optional shared code. The important part is that `runtime` and every `views/*` package are real workspace packages.

---

## 2. App Config

```ts
// electro.config.ts
import { defineElectroConfig } from "@electro/config";

export default defineElectroConfig({
    runtime: "runtime",
    views: ["@views/main", "@views/settings"],
});
```

`runtime` and `views` are explicit. Electro no longer relies on project-wide auto-discovery as the primary documented workflow.

---

## 3. Runtime Package

```json
// runtime/package.json
{
    "name": "runtime",
    "private": true,
    "type": "module"
}
```

```ts
// runtime/runtime.config.ts
import { defineRuntimeConfig } from "@electro/config";

export default defineRuntimeConfig({
    entry: "./src/main.ts",
});
```

```ts
// runtime/src/main.ts
import { AppKernel } from "@electro/runtime";
import { app } from "electron";
import { AppModule } from "./modules/app.module";

const kernel = AppKernel.create(AppModule);

if (!app.requestSingleInstanceLock()) {
    app.quit();
}

app.on("window-all-closed", () => process.platform !== "darwin" && app.quit());
app.on("before-quit", () => kernel.shutdown());

void app.whenReady().then(async () => {
    await kernel.start();
});
```

---

## 4. Root Module

`@Module()` now separates providers, views, and windows explicitly.

```ts
// runtime/src/modules/app.module.ts
import { Module } from "@electro/common";
import { inject } from "@electro/runtime";
import { NotesModule } from "./notes/notes.module";
import { MainView } from "./app.view";
import { MainWindow } from "./app.window";

@Module({
    imports: [NotesModule],
    views: [MainView],
    windows: [MainWindow],
})
export class AppModule {
    private readonly window = inject(MainWindow);

    async onInit() {
        this.window.register();
        await this.window.open();
    }
}
```

Views and windows do not belong in `providers`.

---

## 5. Runtime View

```ts
// runtime/src/modules/app.view.ts
import { View } from "@electro/common";
import { ViewProvider } from "@electro/runtime";

@View({
    source: "view:main",
    access: ["notes:getNotes", "notes:createNote", "notes:deleteNote"],
    signals: ["notes:changed"],
})
export class MainView extends ViewProvider {}
```

`source: "view:main"` binds this class to `view.config.ts` with `viewId: "main"`.

---

## 6. Runtime Window

```ts
// runtime/src/modules/app.window.ts
import { Window } from "@electro/common";
import { inject, WindowProvider } from "@electro/runtime";
import { MainView } from "./app.view";

@Window({
    id: "main",
    configuration: {
        width: 1280,
        height: 800,
        show: false,
    },
})
export class MainWindow extends WindowProvider {
    private readonly view = inject(MainView);

    register() {
        this.create();
    }

    async open() {
        await this.view.load();
        this.mount(this.view);
        this.show();
    }
}
```

---

## 7. View Package

```json
// views/main/package.json
{
    "name": "@views/main",
    "private": true,
    "type": "module"
}
```

```ts
// views/main/view.config.ts
import { defineViewConfig } from "@electro/config";
import react from "@vitejs/plugin-react";

export default defineViewConfig({
    viewId: "main",
    entry: "./index.html",
    plugins: [react()],
});
```

```tsx
// views/main/src/main.tsx
import { ElectroRenderer } from "@electro/renderer";
import ReactDOM from "react-dom/client";
import { App } from "./app";

await ElectroRenderer.initialize(() => {
    ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
});
```

Use `bridge` and `signals` only after `ElectroRenderer.initialize()` has completed.

---

## 8. Generated Types

Electro writes four kinds of generated artifacts:

- `.electro/generated/preload/*.gen.ts`
- `.electro/generated/runtime/registry.gen.ts`
- `runtime/electro-env.d.ts`
- `views/*/electro-env.d.ts`

You do not edit any of them manually.

The important part for IDE support is that each package includes its own `electro-env.d.ts` in `tsconfig.json`.

```json
{
    "include": ["src", "electro-env.d.ts"]
}
```

This is what gives:

- runtime-side typed authoring for modules, views, windows, signals, jobs
- renderer-side typed `bridge` and `signals`

---

## 9. Commands

Run commands from the app workspace root:

```bash
pnpm run dev
pnpm run generate
pnpm run build
pnpm run preview
```

Typical scripts:

```json
{
    "scripts": {
        "dev": "electro dev",
        "generate": "electro generate",
        "build": "electro build",
        "preview": "electro preview"
    }
}
```

---

## 10. What `electro dev` Does

`electro dev` is not just a renderer server. It performs the full app loop:

1. loads `electro.config.ts`
2. scans runtime source and generates artifacts
3. starts one Vite dev server per view package
4. starts watch builds for runtime and preload
5. launches Electron

Renderer file changes go through Vite HMR. Runtime and preload changes rebuild and restart Electron.

For more detail, see [Build Pipeline](./build-pipeline.md) and [Code Generation](./codegen.md).
