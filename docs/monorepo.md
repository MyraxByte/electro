# Monorepo Workspace

This is the supported Electro layout.

Electro is optimized for:

- one application workspace root
- one runtime package
- one renderer view per package
- shared packages alongside them when needed

Other layouts may work, but they are not the documented path and are not something Electro currently optimizes for.

---

## Recommended Structure

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
├── views/
│   ├── main/
│   │   ├── package.json
│   │   ├── view.config.ts
│   │   ├── electro-env.d.ts
│   │   ├── index.html
│   │   └── src/
│   ├── auth/
│   └── settings/
└── packages/
    ├── ui/
    ├── shared-types/
    └── api-client/
```

The key design point is package isolation:

- runtime owns Electron main-process dependencies
- each view owns its frontend dependencies
- each view gets its own Vite dep cache and its own generated renderer types

---

## Why Electro Recommends This

This layout matches how the framework actually behaves:

- `electro.config.ts` resolves packages explicitly
- codegen writes `runtime/electro-env.d.ts` and `views/*/electro-env.d.ts`
- `electro dev` starts one renderer dev server per view package
- each view package has its own dependency graph and its own `node_modules/.vite` cache

That makes typing, HMR behavior, dependency ownership, and debugging far more predictable than a mixed single-package renderer layout.

---

## Workspace Config

```yaml
# pnpm-workspace.yaml
packages:
    - "runtime"
    - "views/*"
    - "packages/*"
```

The application root itself is the Electro app package. `runtime`, every `views/*`, and any `packages/*` entries are regular workspace packages.

---

## App Config

```ts
// electro.config.ts
import { defineElectroConfig } from "@electro/config";

export default defineElectroConfig({
    runtime: "runtime",
    views: ["@views/main", "@views/auth", "@views/settings"],
});
```

Resolution rules:

- `runtime` points to the runtime package
- `views` points to view packages
- Electro resolves them as package specifiers first
- local workspace lookup remains as fallback for linked workspace development

---

## Runtime Package

```json
// runtime/package.json
{
    "name": "runtime",
    "private": true,
    "type": "module",
    "devDependencies": {
        "@electro/common": "link:../../packages/common",
        "@electro/config": "link:../../packages/config",
        "@electro/runtime": "link:../../packages/runtime"
    }
}
```

```json
// runtime/tsconfig.json
{
    "include": ["src", "electro-env.d.ts"]
}
```

The runtime package owns:

- Electron and main-process dependencies
- modules, providers, windows, and views
- generated runtime typing in `electro-env.d.ts`

---

## View Packages

```json
// views/main/package.json
{
    "name": "@views/main",
    "private": true,
    "type": "module",
    "devDependencies": {
        "@electro/config": "link:../../../packages/config",
        "@electro/renderer": "link:../../../packages/renderer"
    }
}
```

```json
// views/main/tsconfig.json
{
    "include": ["src", "electro-env.d.ts"]
}
```

Each view package owns:

- its renderer dependencies
- its `view.config.ts`
- its `index.html`
- its own generated renderer typing in `electro-env.d.ts`

This is the layout Electro recommends and tests against.

---

## Shared Packages

Shared workspace packages are ordinary TypeScript packages with no Electro config:

```json
// packages/ui/package.json
{
    "name": "@app/ui",
    "private": true
}
```

Use them from runtime or views as normal package dependencies.

Keep the ownership boundary clear:

- shared packages do not declare `runtime.config.ts`
- shared packages do not declare `view.config.ts`
- only the runtime package and view packages are Electro surfaces

---

## One View Per Package

This is the recommended rule, not just a suggestion.

Why:

- cleaner dependency ownership
- cleaner generated typing
- cleaner Vite optimize cache behavior
- clearer mapping between runtime `@View({ source: "view:..." })` and renderer package
- simpler CLI output and debugging

If multiple views live in one package, you are outside the preferred model and should expect rough edges.

---

## Commands

From the app root:

```bash
pnpm run dev
pnpm run generate
pnpm run build
pnpm run preview
```

Suggested root scripts:

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

## Generated Files

Electro writes:

- `.electro/generated/preload/*.gen.ts`
- `.electro/generated/runtime/registry.gen.ts`
- `runtime/electro-env.d.ts`
- `views/*/electro-env.d.ts`

Do not edit them manually.

The `.electro/generated` files are framework internals. The `electro-env.d.ts` files are the package-local type surface consumed by IDEs and TypeScript.

---

## What Is Not Documented

The following are intentionally not the recommended path:

- single-repo auto-discovery projects
- many renderer views inside one package as the default architecture
- undocumented package layouts that rely on implicit scanning

If you need those shapes, treat them as advanced or experimental setups, not as the baseline Electro architecture.
