---
title: Application Lifecycle
---

# Application Lifecycle

Every component in ElectroJS — modules, views, and windows — participates in a shared, ordered lifecycle. Understanding this lifecycle is essential for correct resource management and for startup flows such as splash or launch screens.

---

## Lifecycle Phases

The application now boots in two explicit stages: `initialize()` and `start()`.

```ts
const kernel = AppKernel.create(AppModule);
const electronReady = app.whenReady();

await kernel.initialize();
await electronReady;
await kernel.start();
```

At a high level the lifecycle looks like this:

```
 AppKernel.create(AppModule)
          │
          ▼
  ┌──────────────────────┐
  │ 1. kernel.initialize │  Scan graph, build DI, install capabilities
  └──────────┬───────────┘
             ▼
  ┌──────────────────────┐
  │    2. onInit()       │  Prepare state, handlers, listeners, bridge-safe resources
  └──────────┬───────────┘
             ▼
  ┌──────────────────────┐
  │ 3. kernel.initialized│  App graph is ready, waiting for Electron readiness
  └──────────┬───────────┘
             │ app.whenReady()
             ▼
  ┌──────────────────────┐
  │   4. kernel.start    │  Enter startup phase, open bridge for renderer startup flows
  └──────────┬───────────┘
             ▼
  ┌──────────────────────┐
  │    5. onStart()      │  Windows, jobs, auth restore, splash/launch coordination
  └──────────┬───────────┘
             ▼
  ┌──────────────────────┐
  │    6. onReady()      │  Final coordination before the kernel becomes fully started
  └──────────┬───────────┘
             ▼
  ┌──────────────────────┐
  │   7. kernel.started  │  Application is fully running
  └──────────┬───────────┘
             │ kernel.shutdown()
             ▼
  ┌──────────────────────┐
  │   8. onShutdown()    │  Stop active work, flush state, close external resources
  └──────────┬───────────┘
             ▼
  ┌──────────────────────┐
  │    9. onDispose()    │  Final cleanup
  └──────────────────────┘
```

---

## Hook Reference

Each hook has a specific contract. Keeping those boundaries sharp is what makes early bridge access during startup safe.

### `onInit()`

Called during `kernel.initialize()`, before `app.whenReady()` is required.

**Use `onInit()` for:**

- Registering Electron event listeners such as `app.on(...)`
- Setting up deep-link handlers
- Preparing caches, config, repositories, and other bridge-safe dependencies
- Registering anything that startup code may need immediately once `start()` begins

**Do not use `onInit()` for:**

- Opening windows
- Loading views
- Running launch/auth/update flows that depend on Electron UI
- Starting jobs or other active background work

```ts
@Module({ id: "auth", providers: [AuthService] })
export class AuthModule {
    async onInit() {
        app.on("open-url", async (event, url) => {
            event.preventDefault();
            await inject(AuthService).handleDeepLink(url);
        });
    }
}
```

`onInit()` should leave the module in a state where any bridge handler exposed by that module can already execute safely once `start()` begins.

---

### `onStart()`

Called during `kernel.start()`, after `app.whenReady()`.

This is the phase for active startup work. The runtime bridge is opened at the beginning of `starting`, so renderer startup handshakes can happen here.

**Use `onStart()` for:**

- Creating and showing windows
- Loading views
- Launch/splash screen coordination
- Starting jobs
- Kicking off auth/session restore
- Performing startup network requests

```ts
@Window({ id: "splash" })
export class SplashWindow {
    private readonly splashView = inject(SplashView);

    async onStart() {
        this.create();
        await this.splashView.load();
        this.mount(this.splashView);
        this.show();
    }
}
```

---

### `onReady()`

Called after `onStart()` completes for all modules and providers, still inside `kernel.start()`.

`onReady()` is the final coordination phase before the kernel transitions to `started`.

**Use `onReady()` for:**

- Cross-module coordination that depends on all startup work being complete
- Final visibility switches between windows
- Publishing "startup complete" signals
- Last-step validation before the app is considered fully ready

```ts
@Module({ id: "app", imports: [AuthModule], windows: [MainWindow] })
export class AppModule {
    async onReady() {
        if (await inject(AuthService).hasSession()) {
            inject(MainWindow).show();
        }
    }
}
```

---

### `onShutdown()`

Called on shutdown, in reverse dependency order.

**Use `onShutdown()` for:**

- Stopping jobs
- Persisting state
- Closing network connections gracefully
- Removing listeners or subscriptions that should not survive the next launch

**Errors in `onShutdown()` must not block shutdown.** Catch and log them where recovery matters.

---

### `onDispose()`

Called after `onShutdown()`, in reverse dependency order. If the kernel is initialized but never started, only `onDispose()` runs.

**Use `onDispose()` for:**

- Final cleanup
- Releasing file handles
- Freeing memory-heavy resources

**Do not use `onDispose()` for:**

- Starting new async work
- Performing last-minute network bootstrapping

---

## Execution Order

### Initialization

`onInit()` runs dependency-first:

```
HttpModule.onInit()
AuthModule.onInit()
AppModule.onInit()
```

### Startup

`onStart()` runs dependency-first, then `onReady()` runs dependency-first:

```
HttpModule.onStart()
AuthModule.onStart()
AppModule.onStart()

HttpModule.onReady()
AuthModule.onReady()
AppModule.onReady()
```

Only after both phases complete does the kernel become `started`.

### Shutdown

Shutdown still runs in exact reverse dependency order:

```
AppModule.onShutdown()
AuthModule.onShutdown()
HttpModule.onShutdown()

AppModule.onDispose()
AuthModule.onDispose()
HttpModule.onDispose()
```

This guarantees that when `AuthModule.onShutdown()` runs, `AppModule` has already stopped issuing work that depends on `AuthService`.

---

## Windows and Views

Windows and views participate in the same lifecycle and follow the same guidance:

- `onInit()` for registration and lightweight preparation
- `onStart()` for `create()`, `load()`, `mount()`, and startup UI behavior
- `onReady()` for final coordination once all startup work is complete

```ts
@Window({ id: "main" })
export class MainWindow {
    private readonly mainView = inject(MainView);

    async onStart() {
        this.create();
        await this.mainView.load();
        this.mount(this.mainView);
    }

    async onReady() {
        this.show();
    }
}
```

---

## Error Handling

If `onInit()`, `onStart()`, or `onReady()` throws, the application does not finish booting. The runtime rolls back the startup sequence and transitions the kernel to `failed`.

If `onShutdown()` or `onDispose()` throws, the runtime logs the failure and continues shutting down the remaining components.

---

## Practical Rule

If a renderer command is allowed to run during startup, everything it depends on must already be prepared in `onInit()`.

That one rule keeps early startup bridge access safe while still allowing launch screens, splash handshakes, and renderer-driven startup flows during `onStart()`.
