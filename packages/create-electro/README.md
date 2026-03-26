# create-electro

Scaffold a new ElectroJS application with the supported monorepo-first layout.

## Usage

```bash
npm create electro@latest my-app
```

or

```bash
pnpm create electro my-app
```

The generated project contains:

- a root `electro.config.ts`
- a `runtime/` package
- a `views/main/` package
- package-local `electro-env.d.ts` starter files

ElectroJS documents and supports this monorepo-style layout. Other layouts are outside the documented path.
