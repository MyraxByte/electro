---
title: Renderer
---

# Renderer

The renderer side of ElectroJS is a normal frontend package that uses `@electrojs/renderer`.

Each view package owns:

- its `view.config.ts`
- its `index.html`
- its frontend source
- its generated `electro-env.d.ts`

The recommended layout is one renderer view per package.

---

## View Package Shape

```txt
views/main/
├── package.json
├── tsconfig.json
├── view.config.ts
├── electro-env.d.ts
├── index.html
└── src/
    ├── main.tsx
    └── app.tsx
```

The package-local `electro-env.d.ts` is what provides typed `bridge` and `signals`.

---

## `view.config.ts`

```ts
import { defineViewConfig } from "@electrojs/config";
import react from "@vitejs/plugin-react";

export default defineViewConfig({
    viewId: "main",
    entry: "./index.html",
    plugins: [react()],
});
```

`viewId` must match the runtime-side `@View({ source: "view:main" })`.

---

## Bootstrapping

Use `ElectroRenderer.initialize(...)`.

```tsx
import { ElectroRenderer } from "@electrojs/renderer";
import ReactDOM from "react-dom/client";
import { App } from "./app";

await ElectroRenderer.initialize(() => {
    ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
});
```

This does three things:

- reads the preload API from `window.__ELECTRO_RENDERER__`
- creates the bridge client
- creates the signals client

`bridge` and `signals` must not be used before initialization finishes.

---

## Bridge

Import `bridge` from `@electrojs/renderer`:

```ts
import { bridge } from "@electrojs/renderer";

const notes = await bridge.notes.getNotes();
await bridge.notes.createNote("Title", "Body");
```

The available namespaces and methods are generated from runtime source and constrained by the current view's `access` list.

---

## Signals

Import `signals` from `@electrojs/renderer`:

```ts
import { signals } from "@electrojs/renderer";

const subscription = signals.subscribe("notes:changed", (payload) => {
    console.log(payload);
});

subscription.unsubscribe();
```

One-time subscriptions are also supported:

```ts
signals.once("notes:changed", (payload) => {
    console.log(payload);
});
```

Signal keys and payloads are also generated from runtime source and constrained by the current view's `signals` list.

---

## Typing Model

ElectroJS augments `@electrojs/renderer` inside each view package's `electro-env.d.ts`.

That means you do not manually write bridge typings in renderer code. You only:

1. declare runtime `@query()` / `@command()` / `@signal()` contracts
2. declare view access in runtime `@View(...)`
3. include `electro-env.d.ts` in the view package `tsconfig.json`

```json
{
    "include": ["src", "electro-env.d.ts"]
}
```

---

## Errors You Will See

Renderer-side misuse shows up as explicit runtime errors:

- calling `ElectroRenderer.initialize()` twice
- using `bridge` before initialization
- using `signals` before initialization
- missing preload API on `window.__ELECTRO_RENDERER__`

These are framework errors, not silent failures.

---

## Relationship to Runtime `@View()`

The renderer package does not declare runtime permissions itself.

The source of truth is the runtime-side `@View()` class:

```ts
@View({
    source: "view:main",
    access: ["notes:getNotes", "notes:createNote"],
    signals: ["notes:changed"],
})
export class MainView extends ViewProvider {}
```

The renderer package is just the frontend surface bound to that runtime declaration.

---

## Development Model

During `electro dev`:

- each view package gets its own Vite dev server
- renderer source changes go through HMR
- runtime/preload changes rebuild and restart Electron

This separation is one of the reasons ElectroJS recommends one view per package as the default architecture.
