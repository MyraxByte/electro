---
title: Modules
---

# Modules

Modules are the primary organizational unit in Electro. Every piece of functionality belongs to a module. Modules define explicit dependency boundaries, control provider visibility, and participate in the application lifecycle.

---

## What a Module Does

A module is responsible for:

1. **Grouping** related services and providers into a cohesive domain (e.g., `AuthModule`, `HttpModule`)
2. **Declaring dependencies** — which other modules it needs
3. **Controlling visibility** — which of its providers are public vs. private
4. **Lifecycle hooks** — running code at the correct phase of startup and shutdown

Modules do **not** have direct access to `SignalBus` or `JobRegistry`. Signal subscriptions and job management belong in services declared inside the module.

---

## Defining a Module

```ts
import { Module } from "@electrojs/common";
import { inject } from "@electrojs/runtime";
import { AuthService } from "./auth.service";
import { HttpModule } from "../http/http.module";
import { ConfigModule } from "../config/config.module";

@Module({
    id: "auth", // Optional — inferred from class name if omitted
    imports: [HttpModule, ConfigModule], // Modules whose exports this module can use
    providers: [AuthService], // Services owned by this module (private by default)
    exports: [AuthService], // Services other modules are allowed to inject
})
export class AuthModule {
    async onInit() {
        /* ... */
    }
    async onStart() {
        /* ... */
    }
    async onReady() {
        /* ... */
    }
    async onShutdown() {
        /* ... */
    }
    async onDispose() {
        /* ... */
    }
}
```

### `@Module` Options

| Option      | Type           | Description                                                                 |
| ----------- | -------------- | --------------------------------------------------------------------------- |
| `id`        | `string`       | Unique identifier. Defaults to the class name lowercased.                   |
| `imports`   | `Module[]`     | Other modules whose **exported** providers become available via `inject()`. |
| `providers` | `Injectable[]` | All services owned by this module. Private unless exported.                 |
| `exports`   | `Injectable[]` | Subset of `providers` visible to importing modules.                         |

---

## Imports and Exports

The `imports`/`exports` mechanism enforces encapsulation between domains.

```
HttpModule
  exports: [HttpService]

AuthModule
  imports: [HttpModule]         → gains access to HttpService
  providers: [AuthService, TokenCache]
  exports: [AuthService]        → only AuthService is public
                                   TokenCache stays private

AppModule
  imports: [AuthModule]
  → can inject AuthService ✅
  → cannot inject TokenCache ❌  (not exported)
  → cannot inject HttpService ❌  (not re-exported by AuthModule)
```

```ts
@Module({ id: "app", imports: [AuthModule] })
export class AppModule {
    async onReady() {
        const auth = inject(AuthService); // ✅ exported by AuthModule
        const http = inject(HttpService); // ❌ Error: not in scope
    }
}
```

---

## Lifecycle Hooks in Modules

See [Application Lifecycle](/versions/v1.0/core/lifecycle) for the full phase reference.

```ts
@Module({ id: "auth", imports: [HttpModule], providers: [AuthService] })
export class AuthModule {
    async onInit() {
        // Prepare bridge-safe dependencies and register app-level listeners.
    }

    async onStart() {
        // Startup side effects: windows, jobs, network bootstrapping.
        await inject(AuthService).restoreSession();
    }

    async onReady() {
        // Final coordination before the kernel becomes fully started.
        inject(AuthService).notifyStartupComplete();
    }

    async onShutdown() {
        await inject(AuthService).persistSession();
    }

    async onDispose() {
        // Final cleanup
    }
}
```

---

## Cross-Module Communication

Modules do not call each other directly. There are two sanctioned patterns:

### 1. Dependency Injection (direct calls)

When `ModuleA` imports `ModuleB`, it can call exported services directly.

```ts
@Module({ id: "projects", imports: [AuthModule], providers: [ProjectService] })
export class ProjectsModule {
    async onStart() {
        // AuthModule is imported → AuthService is in scope
        const user = await inject(AuthService).getMe();
        await inject(ProjectService).loadForUser(user?.id);
    }
}
```

Use this for synchronous or request-response style communication.

### 2. Signals (event-driven communication)

Services emit signals; other services react via `@signal` handlers. The module boundary is transparent to both sides.

```ts
// In AuthService (auth module) — publishes
@Injectable()
export class AuthService {
    private readonly signals = inject(SignalBus);

    @command()
    async login(email: string, password: string): Promise<void> {
        const { user, isNew } = await inject(HttpService).post("/api/auth/login", { email, password });
        inject(AuthState).setSession(user);
        this.signals.publish("auth:user-logged-in", { user, isNew });
    }
}

// In WorkspaceService (workspace module) — reacts
@Injectable()
export class WorkspaceService {
    @signal({ id: "auth:user-logged-in" })
    async onUserLoggedIn(ctx: SignalContext, payload: { user: User }): Promise<void> {
        await this.loadForUser(payload.user.id);
    }
}
```

`WorkspaceModule` does not need to import `AuthModule` to react to `"auth:user-logged-in"`. Signals are global across the runtime.

> See [Signals](/versions/v1.0/core/signals) for the full signal API.

---

## Module File Structure

```
modules/
├── auth/
│   ├── auth.module.ts        ← @Module declaration
│   ├── auth.service.ts       ← @Injectable with @query / @command / @signal
│   ├── auth.state.ts         ← @Injectable state holder
│   └── auth.types.ts         ← Domain types and interfaces
│
├── http/
│   ├── http.module.ts
│   └── http.service.ts
│
└── config/
    ├── config.module.ts
    └── config.service.ts
```

---

## Root Module

The root module is the entry point of the module graph. It is passed to `AppKernel.create()` and typically contains no providers of its own — its purpose is composition.

```ts
// runtime/modules/app.module.ts
@Module({
    imports: [ConfigModule, HttpModule, AuthModule, WorkspaceModule, UpdaterModule],
})
export class AppModule {}
```

---

## Rules

**No circular imports.** If `AuthModule` imports `UserModule` and `UserModule` imports `AuthModule`, the framework will throw. Extract shared logic into a third module.

**Import modules, not classes directly.** Access to `HttpService` comes from importing `HttpModule`, not from importing the class across a directory boundary.

**Keep providers private unless they must be shared.** Every export is a public API commitment. Fewer exports mean fewer breaking changes.

**Never use `SignalBus` or `JobRegistry` directly in a `@Module` class.** These are only injectable in `@Injectable`, `@View`, and `@Window`. Put the logic in a service.
