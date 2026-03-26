# @electrojs/runtime

The main-process runtime for ElectroJS applications.

`@electrojs/runtime` manages the full lifecycle of an Electron main process: scanning decorator metadata, building the module graph, wiring dependency injection, running lifecycle hooks, exposing a typed IPC bridge, dispatching signals, and scheduling background jobs. It is the layer between your application code and the Electron APIs.

---

## Installation

```bash
npm install @electrojs/runtime
```

> Peer dependency: `@electrojs/common` must be installed alongside.

---

## Quick start

```ts
import { Module, Injectable, command, query } from "@electrojs/common";
import { AppKernel, createConsoleLogger } from "@electrojs/runtime";

@Injectable()
class GreetingService {
    @query()
    hello() {
        return "world";
    }

    @command()
    setLocale(locale: string) {
        // ...
    }
}

@Module({ providers: [GreetingService] })
class AppModule {}

const kernel = AppKernel.create(AppModule, {
    logger: createConsoleLogger(),
});
await kernel.start();
```

`AppKernel.create` scans `AppModule`, validates the module graph, creates the DI container, instantiates module declarations, and runs startup lifecycle hooks. That single call is enough to bootstrap a working application.

Modules, providers, windows, and views also receive `this.logger` through the authoring API, so app-level logs can use the same runtime logger contract and be redirected to a file, Sentry, or any other sink by passing a custom logger into `AppKernel.create(...)`.

---

## Modules

Every feature lives inside a module. A module declares what it owns and what it shares:

```ts
@Module({
    imports: [DatabaseModule],
    providers: [UserService],
    views: [UserView],
    windows: [UserWindow],
    exports: [UserService, UserWindow],
})
class UserModule {}
```

- **imports** -- modules this module depends on. Their exported declarations become available for injection.
- **providers** -- service and infrastructure classes managed by this module.
- **views** -- renderer view classes owned by this module.
- **windows** -- window host classes owned by this module.
- **exports** -- declarations shared with modules that import this one.

The framework builds a directed acyclic graph from imports, detects cycles at startup, and instantiates modules in dependency-first (topological) order.

---

## Providers and dependency injection

Providers are classes decorated with `@Injectable()`. They hold business logic, repositories, and infrastructure. Views and windows are declared separately in `@Module({ views, windows })`.

Inject dependencies with the `inject()` function:

```ts
import { inject, Injector } from "@electrojs/runtime";

@Injectable()
class AuthService {
    private readonly db = inject(DatabaseService);
    private readonly config = inject(ConfigService);

    @query()
    getMe() {
        return this.db.findUser(this.config.get("userId"));
    }
}
```

`inject()` works inside:

- **Property initializers** -- during construction of framework-managed classes
- **Lifecycle hooks** -- `onInit`, `onReady`, `onShutdown`, `onDispose`
- **Capability handlers** -- methods decorated with `@command`, `@query`, `@signal`, `@job`

Calling it outside these scopes throws a `DIError`.

### Scopes

- `singleton` (default) -- one instance per module injector
- `transient` -- a new instance every time the token is resolved

```ts
@Injectable({ scope: "transient" })
class RequestContext {}
```

---

## Lifecycle hooks

Modules and providers can implement lifecycle hooks to participate in startup and shutdown:

```ts
@Injectable()
class DatabaseService {
    async onInit() {
        await this.pool.connect();
    }

    async onReady() {
        await this.runMigrations();
    }

    async onShutdown() {
        await this.pool.end();
    }

    onDispose() {
        this.logger.flush();
    }
}
```

| Hook         | Phase    | Purpose                                              |
| ------------ | -------- | ---------------------------------------------------- |
| `onInit`     | Startup  | Set up resources (connections, state)                |
| `onReady`    | Startup  | Cross-module coordination, everything is initialized |
| `onShutdown` | Shutdown | Release resources gracefully                         |
| `onDispose`  | Shutdown | Final cleanup (file handles, timers)                 |

**Ordering:** Startup hooks run per-module in dependency-first order. Within each module, provider hooks run before the module's own hook. Shutdown runs in the reverse order -- module first, then its providers.

If a startup hook throws, the framework automatically rolls back already-initialized modules by calling their shutdown hooks.

---

## Bridge (IPC)

The bridge connects the main process to renderer views with typed channels. Decorate methods with `@command()` or `@query()` to expose them to the renderer:

```ts
@Injectable()
class FileService {
    @query()
    async listFiles(directory: string): Promise<string[]> {
        return fs.readdir(directory);
    }

    @command()
    async deleteFile(path: string): Promise<void> {
        await fs.unlink(path);
    }
}
```

- **Queries** are read-only operations -- they return data without side effects.
- **Commands** perform mutations.

Channel names are derived as `moduleId:methodName` (e.g. `file:listFiles`). Views declare which channels they can access:

```ts
@View({
    source: "view:main",
    access: ["file:listFiles", "file:deleteFile"],
})
class MainView extends ViewProvider {}
```

Calls from a view to channels not listed in `access` are rejected by the `BridgeAccessGuard`.

---

## Signals

Signals provide fire-and-forget cross-module communication. Any provider can publish; any provider can subscribe.

### Declarative handlers

Use the `@signal()` decorator to subscribe a method at bootstrap time:

```ts
@Injectable()
class NotificationService {
    @signal({ id: "user-logged-in" })
    onUserLogin(payload: { userId: string }) {
        this.showWelcome(payload.userId);
    }
}
```

### Programmatic API

Use `SignalBus` directly for runtime subscriptions:

```ts
@Injectable()
class AuditService {
    private readonly bus = inject(SignalBus);

    onInit() {
        this.bus.subscribe("user-logged-in", (payload) => {
            this.log("login", payload);
        });
    }
}
```

Publishing a signal:

```ts
this.bus.publish("user-logged-in", { userId: "42" });
```

Handlers run asynchronously via microtasks. Each handler retains the injection context from the point where it was subscribed, so `inject()` works correctly inside handlers.

---

## Jobs

Jobs are background tasks that can run on a cron schedule or be triggered manually. Decorate a method with `@job()`:

```ts
@Injectable()
class SyncService {
    @job({ cron: "0 * * * *" })
    async syncUsers(context: JobContext) {
        const users = await this.fetchRemoteUsers();

        for (const [i, user] of users.entries()) {
            if (context.isCancelled) break;
            context.reportProgress(((i + 1) / users.length) * 100);
            await this.upsert(user);
        }
    }
}
```

The first argument is always a `JobContext`, which provides:

- `isCancelled` -- check whether the job was cancelled
- `reportProgress(percent)` -- report 0-100 progress

Jobs without a `cron` option are manual-only. Use `JobRegistry` to control them at runtime:

```ts
const jobs = inject(JobRegistry);
await jobs.run("sync:syncUsers"); // trigger manually
jobs.cancel("sync:syncUsers"); // cancel a running job
const state = jobs.getState("sync:syncUsers"); // { status, progress, lastRunAt }
```

---

## Desktop

Windows and views are first-class providers. Extend the base classes `WindowProvider` and `ViewProvider` to manage Electron windows and their content.

### Windows

```ts
@Window({ id: "main", configuration: { width: 1280, height: 800 } })
class MainWindow extends WindowProvider {
    private readonly mainView = inject(MainView);

    onReady() {
        this.create();
        this.mount(this.mainView);
        this.show();
    }
}
```

`WindowProvider` gives you: `create()`, `mount(view)`, `show()`, `hide()`, `focus()`, `close()`, `getBounds()`.

### Views

```ts
@View({
    source: "view:main",
    access: ["file:listFiles", "file:deleteFile"],
    signals: ["user-logged-in"],
})
class MainView extends ViewProvider {
    async onReady() {
        await this.load();
        this.setBounds({ x: 0, y: 0, width: 1280, height: 800 });
        this.setBackgroundColor("#00000000");
    }
}
```

`ViewProvider` gives you: `load()`, `setBounds(rect)`, `setBackgroundColor(color)`, `focus()`. Views are created with strict security defaults: `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`.

---

## Exports

```ts
// App
import { AppKernel } from "@electrojs/runtime";

// Container
import { inject, InjectionContext, Injector } from "@electrojs/runtime";

// Modules
import { ModuleRef, ProviderRef, ModuleRegistry } from "@electrojs/runtime";
import { scanModules, validateAppDefinition } from "@electrojs/runtime";

// Signals
import { SignalBus, SignalContext } from "@electrojs/runtime";

// Jobs
import { JobContext, JobRegistry } from "@electrojs/runtime";

// Desktop
import { WindowProvider, ViewProvider, WindowManager, ViewManager, RendererRegistry, RendererSession } from "@electrojs/runtime";

// Bridge
import { BridgeAccessGuard, BridgeDispatcher, BridgeHandler, serializeBridgeError } from "@electrojs/runtime";

// Errors
import { RuntimeError, BootstrapError, DIError, LifecycleError, BridgeError, SignalError, JobError } from "@electrojs/runtime";
```

Type-only imports:

```ts
import type {
    AppDefinition,
    ModuleDefinition,
    ProviderDefinition,
    ViewDefinition,
    WindowDefinition,
    BridgeMethodDefinition,
    SignalHandlerDefinition,
    JobDefinition,
    KernelState,
    ModuleStatus,
    LifecycleTarget,
    ModuleSnapshot,
    ProviderSnapshot,
    JobStatus,
    JobRuntimeState,
    BridgeRequest,
    BridgeResponse,
    SignalHandler,
    SignalListener,
    ContextualSignalHandler,
    ProviderKind,
    BridgeMethodKind,
} from "@electrojs/runtime";
```

---

## Package layering

```txt
@electrojs/common        ← decorators, metadata, DI primitives
    ↑
@electrojs/runtime       ← this package: DI container, lifecycle, bridge, signals, jobs, desktop
    ↑
@electrojs/renderer      ← renderer-side bridge client, signal subscriptions
```

`@electrojs/common` defines the shared vocabulary. `@electrojs/runtime` implements the main-process engine. `@electrojs/renderer` provides the renderer-side counterpart.
