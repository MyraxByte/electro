# Electro

Electro is a TypeScript framework for Electron applications built around a module runtime, explicit renderer boundaries, and generated typing between main and renderer.

The current direction is intentionally narrow:

- Electro is documented for a monorepo-style application layout
- the recommended shape is `one renderer view = one package`
- runtime UI ownership is explicit through `@Module({ views, windows })`
- renderer typing is provided through generated `electro-env.d.ts` files inside each package

If you build outside this shape, you are outside the documented path.

The shortest supported path is:

```bash
npm create electro@latest my-app
```

---

## Core Ideas

| Idea                   | What it means in Electro                                                                   |
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

Electro still generates internal build artifacts under `.electro/generated`, but the important authoring types now live in package-local `electro-env.d.ts`.

---

## Runtime and Renderer

Electro has two execution worlds:

- runtime: Electron main process, modules, providers, windows, views, jobs, signals
- renderer: per-view frontend bundles that use `@electrojs/renderer`

The renderer never talks to Electron directly. It only uses:

- `bridge.<module>.<method>(...)`
- `signals.subscribe(...)`
- `signals.once(...)`

Those APIs are typed from runtime source and each view's declared access/signal surface.

---

## Main Docs

| Document                                          | Purpose                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------- |
| [Getting Started](./getting-started.md)           | Build a new app with the recommended workspace layout               |
| [Monorepo](./monorepo.md)                         | Reference for the supported package layout and dependency ownership |
| [Build Pipeline](./build-pipeline.md)             | What `dev`, `generate`, `build`, and `preview` actually do          |
| [Code Generation](./codegen.md)                   | What Electro generates and why                                      |
| [Renderer](./renderer.md)                         | Renderer bootstrap, bridge, signals, and typing                     |
| [Views — Runtime Side](./views-runtime.md)        | Runtime-side `@View()` authoring                                    |
| [Windows](./windows.md)                           | Runtime-side `@Window()` authoring                                  |
| [Modules](./modules.md)                           | Module composition, imports, exports, and lifecycle ownership       |
| [Providers](./providers.md)                       | Injectable services and internal module logic                       |
| [Signals](./signals.md)                           | Fire-and-forget runtime notifications                               |
| [Jobs](./jobs.md)                                 | Background and scheduled work                                       |
| [Dependency Injection](./dependency-injection.md) | `inject()`, tokens, scopes, and provider resolution                 |
| [Registry](./registry.md)                         | Runtime registries and scanned application metadata                 |

---

## App Config Today

`defineElectroConfig(...)` currently describes runtime/view package resolution and optional codegen behavior. It is intentionally narrow:

- explicit `runtime` package
- explicit `views` package list
- optional `codegen.scanDir`

Packaging identity and installer metadata are not part of the supported app config surface yet.
