# @electro/cli

Electro CLI for development, code generation, build, and preview.

## Installation

```bash
pnpm add -D @electro/cli @electro/codegen @electro/config @electro/runtime electron vite
```

## Commands

### `electro dev`

Starts the full development environment:

- loads `electro.config.ts`
- runs code generation
- starts one Vite dev server per renderer view
- watches runtime and preload builds
- launches Electron

### `electro generate`

Runs code generation only.

Outputs include:

- `.electro/generated/preload/*.gen.ts`
- `.electro/generated/runtime/registry.gen.ts`
- `runtime/electro-env.d.ts`
- `views/*/electro-env.d.ts`

### `electro build`

Builds runtime, preload, and renderer output for production.

### `electro preview`

Builds the app and launches the production output in Electron.

## Config Shape

```ts
import { defineElectroConfig } from "@electro/config";

export default defineElectroConfig({
    runtime: "runtime",
    views: ["@views/main", "@views/settings"],
});
```

Electro expects a monorepo-style project:

- `runtime` is an explicit package specifier
- `views` is an explicit list of view package specifiers
- each view package owns its own `view.config.ts`

Electro no longer documents auto-discovery-only single-repo setups as the supported path.

## Typical Layout

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
    │   └── src/main.tsx
    └── settings/
```

## Scaffold

Use the scaffold package to start a new project:

```bash
npm create electro@latest my-app
```
