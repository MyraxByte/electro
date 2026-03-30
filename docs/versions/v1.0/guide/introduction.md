---
title: Introduction
description: Overview of the ElectroJS TypeScript framework for Electron applications
---

# ElectroJS

ElectroJS is a TypeScript framework for Electron applications built around a module runtime, explicit renderer boundaries, and generated typing between main and renderer.

The documented ElectroJS model is intentionally narrow:

- ElectroJS is documented for a monorepo-style application layout
- the recommended shape is `one renderer view = one package`
- runtime UI ownership is explicit through `@Module({ views, windows })`
- renderer typing is provided through generated `electro-env.d.ts` files inside each package

If you build outside this shape, you are outside the supported baseline described in these docs.

The shortest supported path is:

```bash
npm create electro@latest my-app
```

---

## Core Ideas

| Idea                   | What it means in ElectroJS                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| Explicit boundaries    | Renderers can only call bridge methods declared in their `@View({ access })` list          |
| Module ownership       | A module owns its providers, views, windows, lifecycle, and public runtime API             |
| Generated contracts    | Access keys, signal keys, runtime authoring, and renderer bridge typing are code-generated |
| Electron-first runtime | Runtime and preload are built for Electron, renderers are served by Vite                   |
| Practical DX           | `electro dev` handles codegen, renderer dev servers, preload, runtime, and Electron launch |

---

## Recommended Workspace Shape

```txt
my-app/
├── electro.config.ts
├── pnpm-workspace.yaml
├── package.json
├── runtime/
│   ├── package.json
│   ├── runtime.config.ts
│   ├── electro-env.d.ts
│   └── src/
└── views/
    ├── main/
    │   ├── package.json
    │   ├── view.config.ts
    │   ├── electro-env.d.ts
    │   ├── index.html
    │   └── src/
    └── settings/
```

ElectroJS generates internal build artifacts under `.electro/generated`, and the authoring types live in package-local `electro-env.d.ts`.

---

## Runtime and Renderer

ElectroJS has two execution worlds:

- runtime: Electron main process, modules, providers, windows, views, jobs, signals
- renderer: per-view frontend bundles that use `@electrojs/renderer`

The renderer never talks to Electron directly. It only uses:

- `bridge.<module>.<method>(...)`
- `signals.subscribe(...)`
- `signals.once(...)`

Those APIs are typed from runtime source and each view's declared access/signal surface.

---

## Main Docs

| Document                                           | Purpose                                                             |
| -------------------------------------------------- | ------------------------------------------------------------------- |
| [Getting Started](/versions/v1.0/guide/getting-started)          | Build a new app with the recommended workspace layout               |
| [Project Structure](/versions/v1.0/guide/project-structure)      | Reference for the supported package layout and dependency ownership |
| [Dev Workflow](/versions/v1.0/guide/dev-workflow)                | What `dev`, `generate`, `build`, and `preview` actually do          |
| [Code Generation](/versions/v1.0/advanced/codegen)               | What ElectroJS generates and why                                    |
| [Renderer](/versions/v1.0/ui/renderer)                           | Renderer bootstrap, bridge, signals, and typing                     |
| [Views — Runtime Side](/versions/v1.0/ui/views)                  | Runtime-side `@View()` authoring                                    |
| [Windows](/versions/v1.0/ui/windows)                             | Runtime-side `@Window()` authoring                                  |
| [Modules](/versions/v1.0/core/modules)                           | Module composition, imports, exports, and lifecycle ownership       |
| [Providers](/versions/v1.0/core/providers)                       | Injectable services and internal module logic                       |
| [Signals](/versions/v1.0/core/signals)                           | Fire-and-forget runtime notifications                               |
| [Jobs](/versions/v1.0/core/jobs)                                 | Background and scheduled work                                       |
| [Dependency Injection](/versions/v1.0/core/dependency-injection) | `inject()`, tokens, scopes, and provider resolution                 |
| [Registry](/versions/v1.0/advanced/registry)                     | Runtime registries and scanned application metadata                 |

---

## App Config

`defineElectroConfig(...)` describes runtime/view package resolution and optional codegen behavior. It is intentionally narrow:

- explicit `runtime` package
- explicit `views` package list
- optional `codegen.scanDir`

Packaging identity and installer metadata are not part of the supported app config surface.
