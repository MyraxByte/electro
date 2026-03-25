# Views — Runtime Side

A **View** in Electro is a runtime class that wraps a `WebContentsView`. It declares which bridge methods the frontend can call and which signals it receives.

> **Terminology:** "View" always refers to the **runtime-side class** decorated with `@View`. The corresponding frontend code is the **Renderer View**.

---

## The Two Parts of a View

Every View has a counterpart renderer bundle, linked by a shared identifier derived from the `source` field.

```
Runtime side                         Renderer side
────────────────────────             ─────────────────────────
@View({ source: "view:main" })       defineViewConfig({ viewId: "main" })
export class MainView {}             → bundled frontend app
```

The `id` of a view is derived automatically from `source` when the source type is `view:*`. You never need to declare it separately.

---

## Defining a View

```ts
import { View } from "@electrojs/common";

@View({
    // "view:main" → id is automatically "main"
    // Must match viewId in the renderer's view.config.ts
    source: "view:main",

    // Bridge methods this view's renderer is allowed to call
    access: ["auth:getMe", "auth:login", "auth:logout", "workspace:getWorkspaces", "workspace:createWorkspace"],

    // Signals forwarded to this view's renderer
    signals: ["auth:user-logged-in", "auth:user-logged-out", "workspace:created"],
})
export class MainView {}
```

---

## `@View` Options

| Option          | Type       | Required    | Description                                         |
| --------------- | ---------- | ----------- | --------------------------------------------------- |
| `source`        | `string`   | ✅          | What to load (see source types below)               |
| `id`            | `string`   | Conditional | Required only when `source` is not `view:*`         |
| `access`        | `string[]` | ✅          | Bridge methods this view's renderer may call        |
| `signals`       | `string[]` | ✅          | Signals forwarded to this view's renderer           |
| `configuration` | `object`   | —           | Optional `webContents` / `webPreferences` overrides |

---

## Source Types

| Format            | `id` required            | Description                                    |
| ----------------- | ------------------------ | ---------------------------------------------- |
| `"view:<id>"`     | ❌ derived automatically | Bundled renderer view with matching `viewId`   |
| `"file://<path>"` | ✅                       | Local HTML file                                |
| `"http://<url>"`  | ✅                       | External URL (useful for external dev servers) |

### `view:*` — standard case, no `id` needed

```ts
// id = "main" is derived from "view:main"
@View({
    source: "view:main",
    access: ["auth:getMe"],
    signals: [],
})
export class MainView {}
```

### `file:` and `http:` — `id` is required

```ts
// id cannot be derived — must be explicit
@View({
    id: "startup",
    source: "file:./assets/startup.html",
    access: [],
    signals: [],
})
export class StartupView {}

@View({
    id: "devtools",
    source: "http://localhost:5173",
    access: [],
    signals: [],
})
export class DevToolsView {}
```

The TypeScript contract enforces this — `id` is typed as `never` when `source` starts with `view:`, making `@View({ id: "x", source: "view:y" })` a compile error.

---

## Lifecycle Hooks

Views support the full lifecycle. See [Application Lifecycle](./lifecycle.md).

```ts
@View({
    source: "view:main",
    access: ["auth:getMe"],
    signals: ["auth:user-logged-in"],
})
export class MainView {
    async onReady() {
        // Runtime is fully initialized. Start subscriptions.
    }

    async onShutdown() {
        // Cleanup.
    }
}
```

---

## Extending a View

Methods added to a View class are available on the runtime side — for example, to manage child views programmatically.

```ts
import { WebContentsView } from "electron";

@View({
    source: "view:main",
    access: [],
    signals: [],
})
export class MainView {
    appendChildView(child: WebContentsView): void {
        this.contentView.addChildView(child);
    }
}
```

---

## Access Control

The `access` array is a security boundary. A renderer loaded in this view can only call bridge methods explicitly listed here. Unlisted methods are rejected by the bridge dispatcher before they reach any service.

```ts
// Settings view — narrow access
@View({
    source: "view:settings",
    access: ["settings:get", "settings:update"],
    signals: [],
})
export class SettingsView {}

// Main view — broader access
@View({
    source: "view:main",
    access: ["auth:getMe", "workspace:getWorkspaces", "workspace:createWorkspace", "project:getProjects"],
    signals: ["workspace:created", "project:created"],
})
export class MainView {}
```

---

## Registering Views

Views must appear in a module's `views` list to be included in the application.

```ts
@Module({
    views: [MainView, SettingsView, AuthView],
})
export class UIModule {}
```

Once registered, a View is injectable:

```ts
@Window({ id: "main" })
export class MainWindow {
    register() {
        this.create();
        const view = inject(MainView);
        this.mount(view);
    }
}
```

---

## Bridge Types

Each view package gets a generated `electro-env.d.ts` that augments `@electrojs/renderer` for that specific view. Include it in the package `tsconfig.json`. See [Code Generation](./codegen.md) for details.
