# Build Pipeline

ElectroJS has three user-facing commands:

- `electro dev`
- `electro build`
- `electro preview`

All three start from the same base pipeline:

1. load `electro.config.ts`
2. resolve the runtime package and view packages
3. scan runtime source with codegen
4. write generated preload, registry, and package-local env types

---

## Generated Outputs

ElectroJS currently generates these files:

| Output            | Path                                         | Purpose                                                              |
| ----------------- | -------------------------------------------- | -------------------------------------------------------------------- |
| Preload entry     | `.electro/generated/preload/{viewId}.gen.ts` | Creates the preload bridge client for a view                         |
| Runtime registry  | `.electro/generated/runtime/registry.gen.ts` | Exposes scanned modules, views, and windows to the runtime bootstrap |
| Runtime env types | `runtime/electro-env.d.ts`                   | Runtime authoring and registry typing                                |
| View env types    | `views/*/electro-env.d.ts`                   | Renderer-side typed `bridge` and `signals`                           |

These files are regenerated automatically and should not be edited manually.

---

## `electro dev`

`electro dev` is the full development loop, not just a renderer server.

### Startup sequence

1. load app config
2. resolve runtime package and view packages
3. run codegen
4. start one Vite dev server per view package
5. start watch builds for runtime and preload
6. launch Electron

### Change behavior

| What changed                           | Result                                                   |
| -------------------------------------- | -------------------------------------------------------- |
| View source (`views/*/src`, CSS, HTML) | Vite HMR in that renderer view                           |
| `view.config.ts`                       | view server restart for that package                     |
| Runtime source (`runtime/src/**`)      | runtime rebuild and Electron restart                     |
| Bridge/signal shape                    | codegen rerun, preload/runtime rebuild, Electron restart |
| Generated files                        | overwritten automatically                                |

### Important detail

Runtime and preload are not served as renderer-style Vite dev servers. They are built in watch mode and Electron runs the emitted files. Renderer views use Vite dev servers.

---

## `electro build`

`electro build` produces a production-ready output directory.

### High-level flow

1. codegen
2. build runtime bundle
3. build preload bundles
4. build renderer bundles
5. flatten renderer HTML output for packaged runtime lookup

The CLI currently uses Vite/Rolldown for build work. Renderer minification is part of that pipeline already.

---

## `electro preview`

`electro preview` is:

1. `electro build`
2. launch Electron against the built output

It is a smoke test for production output, not a dev-mode session.

---

## Package Resolution

ElectroJS resolves `runtime` and `views` from `electro.config.ts` as package specifiers first. The current CLI uses `oxc-resolver` for that path and keeps a local workspace fallback for linked workspace development.

That gives ElectroJS two important behaviors:

- installed package resolution works without workspace scanning
- local workspace packages still resolve even when the package is linked rather than published

---

## Why One View Per Package Matters

Electro's build pipeline is optimized around one renderer package per view:

- one Vite dev server per view package
- one generated `electro-env.d.ts` per view package
- one Vite dependency cache per view package
- clearer logging and view URL reporting

This is why the docs recommend that layout instead of a shared multi-view package as the default.

---

## Output Layout

A typical app workspace ends up with:

```txt
my-app/
├── .electro/
│   └── generated/
├── dist/
│   ├── main/
│   ├── preload/
│   └── renderer/
├── runtime/
│   └── electro-env.d.ts
└── views/
    ├── main/electro-env.d.ts
    └── settings/electro-env.d.ts
```

`dist/` is production output. `.electro/generated` is build-time infrastructure. `electro-env.d.ts` files are the IDE/type integration surface.

---

## App Config in the Pipeline

At build time ElectroJS currently uses `electro.config.ts` for package resolution and codegen configuration:

- `runtime` points at the runtime package
- `views` points at renderer view packages
- `codegen.scanDir` can narrow the scan root when needed

Application identity, packaging metadata, and installer concerns are intentionally not part of the supported config surface yet.
