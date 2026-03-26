# **ElectroJS Starter**

ElectroJS monorepo application scaffolded with `create-electro`.

Documentation: https://electrojs.myraxbyte.dev/

## Commands

```bash
pnpm install
pnpm run dev
pnpm run generate
pnpm run build
pnpm run preview
```

## Layout

- `runtime/` contains the Electron main-process runtime package
- `views/main/` contains the first renderer package
- `electro.config.ts` wires runtime and views together through explicit package specifiers
