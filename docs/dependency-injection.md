# Dependency Injection

Electro's DI system is synchronous, hierarchical, and token-based. All dependencies are resolved through a single function: `inject()`.

---

## `inject()`

`inject()` resolves a provider from the current injection context and returns its instance.

```ts
import { inject } from "@electro/runtime";
import { AuthService } from "./auth.service";

@Injectable()
export class WorkspaceService {
    private readonly auth = inject(AuthService);
    private readonly config = inject(ConfigService);
    private readonly logger = inject(Logger);
}
```

### Where `inject()` is valid

`inject()` is only callable inside an **injection context** — this is any class that the framework itself constructs. These include:

- `@Injectable()` class property initializers
- `@Module()` class property initializers
- `@Window()` class property initializers
- `@View()` class property initializers

```ts
// ✅ Valid injection contexts
@Injectable()
export class MyService {
    private dep = inject(OtherService); // ✅
}

@Module({ id: "app" })
export class AppModule {
    private auth = inject(AuthService); // ✅
}

@Window({ id: "main" })
export class MainWindow {
    private auth = inject(AuthService); // ✅
}

// ❌ Invalid — no injection context
function handleClick() {
    const auth = inject(AuthService); // ❌ throws: no injection context
}

setTimeout(() => {
    const auth = inject(AuthService); // ❌ throws: context lost in callback
}, 100);
```

---

## Injection Tokens

A token is the key used to look up a provider in the injector.

### Class Tokens (most common)

When you pass a class to `inject()`, the class itself is the token. This is the standard pattern for all `@Injectable` classes.

```ts
const auth = inject(AuthService); // AuthService class is the token
const http = inject(HttpService); // HttpService class is the token
```

### Symbol Tokens (for values and interfaces)

When you need to inject a primitive value, a plain object, or an interface (which has no runtime class), use `createInjectionToken`.

```ts
import { createInjectionToken } from "@electro/runtime";

// Define tokens with their TypeScript type
export const API_BASE_URL = createInjectionToken<string>("API_BASE_URL");
export const APP_CONFIG = createInjectionToken<AppConfig>("APP_CONFIG");

// Register their values in a module
@Module({
    providers: [
        { provide: API_BASE_URL, useValue: process.env.API_URL ?? "http://localhost:3000" },
        { provide: APP_CONFIG, useValue: loadConfig() },
    ],
    exports: [API_BASE_URL, APP_CONFIG],
})
export class ConfigModule {}

// Inject them in any service that imports ConfigModule
@Injectable()
export class HttpService {
    private readonly baseUrl = inject(API_BASE_URL);
}
```

> **Never use raw strings as tokens.** `inject("authService" as any)` loses all type information and breaks at runtime in non-obvious ways. Use class tokens or typed symbol tokens.

---

## Provider Scopes

The scope controls how many instances of a provider exist.

### `singleton` (default)

A single instance is created once and reused everywhere. This is the correct choice for stateless services, HTTP clients, and loggers.

```ts
@Injectable() // singleton is the default
export class HttpService {}

@Injectable({ scope: "singleton" }) // explicit — same effect
export class Logger {}
```

### `transient`

A new instance is created every time the provider is injected. Use this for stateful objects that must not be shared.

```ts
@Injectable({ scope: "transient" })
export class FormValidationContext {
    readonly errors: ValidationError[] = [];
    addError(error: ValidationError) {
        this.errors.push(error);
    }
}
```

> **Warning:** Injecting a `transient` provider in multiple places within the same class gives you multiple independent instances. This is usually what you want, but be aware of it.

---

## Injector Hierarchy

The DI container is hierarchical. Each module gets its own injector, with the root injector as its ancestor. When `inject()` cannot find a token locally, it walks up the hierarchy.

```
Root Injector
  └── AppModule Injector
        ├── AuthModule Injector       (has AuthService, TokenCache)
        │     └── HttpModule Injector (has HttpService)
        └── WorkspaceModule Injector  (has WorkspaceService)
```

Resolution order for `inject(HttpService)` called from `AuthModule`:

1. Check `AuthModule` injector → not found
2. Check `HttpModule` injector → found ✅

You never need to manage this hierarchy manually — it is built from your module `imports` graph.

---

## RuntimeInjector (Advanced)

For framework-level code or advanced testing scenarios, you can work with `RuntimeInjector` directly.

```ts
import { RuntimeInjector } from "@electro/runtime";

// Create a standalone injector (e.g., for testing)
const injector = new RuntimeInjector();
injector.provide(ConfigService, new ConfigService());
injector.provide(API_BASE_URL, "http://localhost:3000");

// Create a child injector that inherits from parent
const childInjector = new RuntimeInjector(injector);
childInjector.provide(AuthService, new AuthService());

// Resolve
const auth = childInjector.get(AuthService); // from child
const config = childInjector.get(ConfigService); // inherited from parent
```

### Custom resolvers

```ts
injector.registerResolver(AuthService, () => {
    const config = injector.get(ConfigService);
    return new AuthService(config.getApiUrl());
});
```

---

## Troubleshooting

### `Token not found in injector`

The provider is not registered in any module that is imported.

```ts
// Fix: add to providers and ensure the module is imported
@Module({
    providers: [AuthService], // ← must be here
    exports: [AuthService], // ← must be exported if used by other modules
})
export class AuthModule {}
```

### `inject() called outside injection context`

You are calling `inject()` inside a plain function, callback, or event handler — not inside a framework-managed class.

```ts
// ❌ Wrong
app.on("open-url", () => {
    const auth = inject(AuthService); // throws
});

// ✅ Correct: capture the dependency before the callback
@Module({ id: "auth" })
export class AuthModule {
    private readonly auth = inject(AuthService); // ← injected here

    async onInit() {
        app.on("open-url", (event, url) => {
            this.auth.handleDeepLink(url); // ← used here via captured reference
        });
    }
}
```

### Circular dependency

```
Error: Circular dependency detected: AuthService → UserService → AuthService
```

Extract shared logic into a third provider that neither depends on the other.

```ts
// ❌ Circular
class AuthService {
    user = inject(UserService);
}
class UserService {
    auth = inject(AuthService);
}

// ✅ Extract shared logic
class SessionStore {
    /* shared state, depends on nothing */
}
class AuthService {
    store = inject(SessionStore);
}
class UserService {
    store = inject(SessionStore);
}
```
