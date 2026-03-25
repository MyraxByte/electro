# @electro/codegen

Code generator for Electro's module runtime — scans decorator metadata from source and emits preload scripts, runtime registry, and environment type declarations.

`@electro/codegen` provides the `scan` → `generate` pipeline that powers `electro generate` and runs automatically during `electro dev` and `electro build`. It uses the OXC parser to extract `@Module`, `@Injectable`, `@Window`, `@View`, `@command`, `@query`, `@signal`, and `@job` decorators from TypeScript source without executing it.

---

## Installation

```bash
pnpm add -D @electro/codegen
```

> Peer dependencies: `@electro/common`, `@electro/config`, `@electro/runtime`.

---

## Pipeline

### 1. Scan

```ts
import { scan } from "@electro/codegen";

const result = await scan("./src");
```

`scan()` walks the source directory, parses each `.ts` file with OXC, and extracts:

- **Modules** — classes with `@Module()`, including their imports, providers, exports, windows, and views
- **Providers** — classes with `@Injectable()`, including their decorated methods
- **Windows** — classes with `@Window()`, with id and export status
- **Views** — classes with `@View()`, with id, source, access keys, and signal keys
- **Methods** — `@command()` and `@query()` decorated methods, with derived IDs
- **Signals** — detected from `@signal()` decorators, `SignalBus.publish()`, and `SignalBus.subscribe()` calls
- **Jobs** — `@job()` decorated methods, with optional cron expressions

Files matching `*.d.ts`, `*.test.ts`, `*.spec.ts`, `*.gen.ts`, and `node_modules/` are excluded.

### 2. Generate

```ts
import { generate } from "@electro/codegen";

const output = generate({
    scanResult: result,
    views: [{ id: "main" }, { id: "auth" }],
    outputDir: ".electro/generated",
    srcDir: "./runtime",
    packageTargets: [
        { packageRoot: "./views/main", viewId: "main" },
        { packageRoot: "./views/auth", viewId: "auth" },
    ],
});
```

`generate()` validates the scan result, then produces:

| Output | Path | Description |
| --- | --- | --- |
| Preload scripts | `generated/preload/{viewId}.gen.ts` | Per-view bridge client setup via `createBridgeClient()` |
| Runtime registry | `generated/runtime/registry.gen.ts` | Exports scanned modules, windows, views; identifies root module and creates `electroAppDefinition` |
| Runtime environment types | `runtime/electro-env.d.ts` | Ambient registry interfaces for runtime authoring: methods, signals, jobs, injectables, windows, views, and class augmentations |
| View environment types | `views/*/electro-env.d.ts` | Package-local ambient types for `@electro/renderer` bridge contracts and forwarded signal payloads |

---

## Validation

Before generating, the pipeline runs exhaustive checks:

- Duplicate module, window, or view IDs
- Duplicate method IDs within a module (including its providers)
- Unknown access keys — views must reference valid `module:method` pairs
- Unknown signal keys — views must reference known signal IDs
- Missing runtime views — every generator view definition must match a scanned `@View()` class

All diagnostics are collected and thrown as a single `ValidationError` with the full array.

---

## ID derivation

| Entity | Default ID | Override |
| --- | --- | --- |
| Module | Class name minus `Module` suffix, lowercased first char | `@Module({ id: "custom" })` |
| Method | Method name | `@command({ id: "custom" })` / `@query({ id: "custom" })` |
| View | Extracted from `source: "view:<id>"` | `@View({ id: "custom" })` |
| Job | Method name | `@job({ id: "custom" })` |

Public bridge keys follow the `module:method` pattern (e.g., `workspace:openProject`). Signal keys follow the `signalId` pattern (e.g., `projectOpened`).

---

## Exports

```ts
// Pipeline
import { scan, generate } from "@electro/codegen";

// Errors
import { CodegenError, ValidationError } from "@electro/codegen";
```

Type-only imports:

```ts
import type {
    ScanResult,
    ScannedModule,
    ScannedProvider,
    ScannedMethod,
    ScannedSignal,
    ScannedJob,
    ScannedWindow,
    ScannedView,
    GeneratorInput,
    GeneratorOutput,
    GeneratedFile,
    GeneratorViewDefinition,
    CodegenDiagnostic,
} from "@electro/codegen";
```

---

## Package layering

```txt
@electro/common        ← decorator definitions, metadata keys
@electro/config        ← config schema (view definitions)
    ↑
@electro/codegen       ← this package: scanner + generator
    ↑
@electro/cli           ← invokes scan/generate during dev, build, generate commands
```
