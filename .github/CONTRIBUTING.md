# Contributing to ElectroJS

Thanks for your interest in contributing! This guide will help you get started.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v25+
- [pnpm](https://pnpm.io/) v10+

### Setup

```bash
# Clone the repository
git clone https://github.com/MyraxByte/electrojs.git
cd electro

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

## Development Workflow

### Project Structure

```
packages/
  common/       # Shared types and utilities
  config/       # Configuration loading
  renderer/     # Renderer process bridge
  runtime/      # Core runtime, features, services, tasks
  codegen/      # Code generation and scanning
  cli/          # Dev server, build, preview
  create-electro/  # Project scaffolding (create-electro)
apps/
  electro-app/  # Example application
```

### Commands

| Command      | Description                 |
| ------------ | --------------------------- |
| `pnpm build` | Build all packages (tsdown) |
| `pnpm test`  | Run all tests (vitest)      |
| `pnpm lint`  | Lint with oxlint (--fix)    |
| `pnpm fmt`   | Format with oxfmt           |
| `pnpm dev`   | Run example app dev server  |

### Code Style

- **4-space indentation**
- **Double quotes**, semicolons always, trailing commas everywhere
- `import type` must use separated style: `import { type Foo } from "..."` not `import type { Foo }`
- No unused imports (error), no import cycles (error)
- Run `pnpm lint` and `pnpm fmt` before committing

### Testing

- Colocate tests: `task.ts` -> `task.spec.ts`
- Black-box testing only -- test public API, not internals
- One top-level `describe()` per test file

## Making Changes

### Branch Naming

Use descriptive branch names:

- `feat/add-hot-reload`
- `fix/service-scope-resolution`
- `refactor/simplify-runtime-init`

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add hot reload support for services
fix: resolve service scope when feature ID is missing
refactor: simplify runtime initialization flow
docs: update API reference for createFeature
```

### Pull Requests

1. Fork the repository and create your branch from `stable`
2. Make your changes with tests
3. Ensure all checks pass: `pnpm lint && pnpm build && pnpm test`
4. Open a pull request against `stable`
5. Fill out the PR template

### Generated Files

Files matching `*.gen.ts` are managed by codegen. Do not edit them manually -- run `pnpm run generate` in the relevant app instead.

## Reporting Issues

- **Bugs**: Use the [Bug Report](https://github.com/MyraxByte/electrojs/issues/new?template=bug_report.yml) template
- **Features**: Use the [Feature Request](https://github.com/MyraxByte/electrojs/issues/new?template=feature_request.yml) template
- **Security**: See [SECURITY.md](SECURITY.md)

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.
