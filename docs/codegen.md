# Code Generation

`electro generate` scans runtime source and emits the artifacts that make Electro's runtime and renderer contracts type-safe.

Codegen is also run automatically by:

- `electro dev`
- `electro build`
- `electro preview` via its build step

---

## What Codegen Scans

ElectroJS scans the runtime source tree and reads decorator metadata from:

- `@Module()`
- `@Injectable()`
- `@View()`
- `@Window()`
- `@command()`
- `@query()`
- `@signal()`
- `@job()`

From that it builds:

- module ownership
- bridge method keys
- signal ids and payload shapes
- runtime view ids
- runtime registry entries

The scanner is static. It does not execute the code it reads.

---

## What Gets Generated

ElectroJS currently generates four categories of files:

### Internal build artifacts

```txt
.electro/generated/preload/{viewId}.gen.ts
.electro/generated/runtime/registry.gen.ts
```

These are framework internals used by preload and runtime build steps.

### Package-local env types

```txt
runtime/electro-env.d.ts
views/main/electro-env.d.ts
views/auth/electro-env.d.ts
```

These are the important files for IDE and TypeScript integration.

---

## Why `electro-env.d.ts`

ElectroJS used to rely on generated declarations under `.electro/.../bridge.d.ts`.

The current model writes `electro-env.d.ts` directly into each package because IDEs track project-local `.d.ts` files more reliably than generated pseudo-packages under `node_modules` or a shared `.electro` typing tree.

That gives:

- better LSP pickup
- clearer package ownership
- no cross-package renderer typing bleed as the default

---

## Runtime Types

`runtime/electro-env.d.ts` augments runtime authoring contracts so the runtime package gets typed knowledge of:

- valid bridge method keys
- valid signal keys
- known views and windows
- generated module/view/window registries
- authoring helpers attached to module, view, and window classes

This is the runtime-side type layer used by modules, windows, views, and runtime tooling.

---

## Renderer Types

Each view package gets its own `electro-env.d.ts`, which augments `@electrojs/renderer` with:

- typed `bridge`
- typed `signals.subscribe(...)`
- only the methods/signals exposed by that specific runtime `@View`

That means `views/main` and `views/auth` can have different renderer bridge surfaces without manual typing.

---

## Expected `tsconfig.json`

The current recommended setup is simple:

```json
{
    "include": ["src", "electro-env.d.ts"]
}
```

This applies to:

- `runtime/tsconfig.json`
- every `views/*/tsconfig.json`

No manual `.electro/.../bridge.d.ts` includes are needed anymore.

---

## Validation Rules

Before generation, ElectroJS validates the scanned graph.

Examples of generation failures:

- duplicate module ids
- duplicate window ids
- duplicate view ids
- duplicate `module:method` keys inside a module boundary
- unknown access keys in `@View({ access })`
- unknown signal ids in `@View({ signals })`
- missing runtime `@View()` for a configured renderer package

These are build errors, not advisory warnings.

---

## Commands and Signals

Bridge typing comes from runtime methods:

```ts
@Injectable()
export class NotesService {
    @query()
    getNotes(): Promise<Note[]> {
        // ...
    }

    @command()
    createNote(title: string, body: string): Promise<Note> {
        // ...
    }
}
```

And view access controls which methods become visible in a renderer package:

```ts
@View({
    source: "view:main",
    access: ["notes:getNotes", "notes:createNote"],
    signals: ["notes:changed"],
})
export class MainView extends ViewProvider {}
```

From that, the `views/main/electro-env.d.ts` file augments `@electrojs/renderer` so `bridge.notes.getNotes()` and `bridge.notes.createNote(...)` are typed in that package.

---

## Generated Files Are Not Source Files

Do not edit:

- `.electro/generated/**`
- `runtime/electro-env.d.ts`
- `views/*/electro-env.d.ts`

Fix the source definition or fix the generator.

---

## Monorepo Assumption

Current codegen is documented for the package layout described in [Monorepo](./monorepo.md):

- one runtime package
- one renderer view per package
- package-local `electro-env.d.ts`

If you use a different layout, treat that as an advanced setup rather than the baseline documented workflow.
