# @electrojs/config

Typed configuration contracts for Electro applications.

Electro supports a monorepo-style application layout with:

- one root `electro.config.ts`
- one `runtime/` package with `runtime.config.ts`
- one package per renderer view with `view.config.ts`

## Installation

```bash
pnpm add -D @electrojs/config vite typescript
```

## Exports

```ts
import { defineElectroConfig, defineRuntimeConfig, defineViewConfig } from "@electrojs/config";

import type { AppConfig, RuntimeConfig, ViewConfig } from "@electrojs/config";
```

## `electro.config.ts`

```ts
import { defineElectroConfig } from "@electrojs/config";

export default defineElectroConfig({
    runtime: "runtime",
    views: ["@views/main", "@views/settings"],
});
```

`AppConfig`:

```ts
interface AppConfig {
    readonly runtime: string;
    readonly views: readonly string[];
}
```

- `runtime` is the package specifier for the runtime package
- `views` is the explicit list of renderer view package specifiers

Electro no longer documents single-repo auto-discovery as a supported setup.

## `runtime.config.ts`

```ts
import { defineRuntimeConfig } from "@electrojs/config";

export default defineRuntimeConfig({
    entry: "./src/main.ts",
});
```

`RuntimeConfig` extends Vite user config and adds:

```ts
interface RuntimeConfig extends ViteUserConfig {
    readonly entry: string;
}
```

- `entry` points at the Electron main-process entry file inside the runtime package

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

`ViewConfig` extends Vite user config and adds:

```ts
interface ViewConfig extends ViteUserConfig {
    readonly viewId: string;
    readonly entry?: string;
    readonly preload?: string;
}
```

- `viewId` is the bundled renderer id used by runtime `@View({ source: "view:<id>" })`
- `entry` defaults to `./index.html`
- `preload` is optional because Electro usually generates preload entrypoints automatically

## Layout

```txt
my-app/
├── electro.config.ts
├── pnpm-workspace.yaml
├── package.json
├── runtime/
│   ├── runtime.config.ts
│   └── src/main.ts
└── views/
    ├── main/
    │   ├── view.config.ts
    │   ├── index.html
    │   └── src/main.tsx
    └── settings/
```

## Related Packages

- `@electrojs/cli` runs `dev`, `generate`, `build`, and `preview`
- `@electrojs/runtime` powers the Electron runtime
- `@electrojs/renderer` powers the renderer bridge and signals APIs
