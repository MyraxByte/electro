# Contributing

Thanks for your interest in contributing to `electro`.

## Setup

```bash
git clone <repo-url>
cd electro
pnpm install
```

## Development Workflow

```bash
pnpm run build         # Build all packages
pnpm run test          # Run all tests
pnpm run lint          # Lint with oxlint
pnpm run fmt           # Format with oxfmt
```

Run a single spec:

```bash
pnpm vitest run packages/runtime/src/core/task/task.spec.ts
```

## Code Style

Enforced by [oxlint](https://oxc.rs/docs/guide/usage/linter) and [oxfmt](https://oxc.rs/):

- 4-space indentation, 120-char line width
- Double quotes, always semicolons, trailing commas
- `import type` must use separated style: `import { type Foo } from "..."`
- No unused imports, no import cycles

## Testing

- Specs are colocated: `task.ts` → `task.spec.ts`
- One top-level `describe("ClassName")` per spec file
- Black-box only — test the public API, no private field access
- Update or add specs alongside implementation changes

## Commit Messages

Keep commits focused. Use a short summary line describing the change:

```
feat: add retry backoff cap to task scheduler
fix: prevent duplicate service registration
```

## Pull Requests

- Branch from `master`
- Keep PRs focused on a single change
- Ensure `pnpm run test` and `pnpm run lint` pass before submitting
- Describe the motivation and approach in the PR body
