# Application Lifecycle

Every component in ElectroJS — modules, views, and windows — participates in a shared, ordered lifecycle. Understanding this lifecycle is essential for correct resource management.

---

## Lifecycle Phases

The application moves through five sequential phases.

```
 AppKernel.create(AppModule)
          │
          ▼
  ┌────────────────┐
  │   1. CREATION  │  DI container built. Providers instantiated. No side-effects.
  └───────┬────────┘
          │
          ▼
  ┌────────────────┐
  │   2. onInit()  │  Synchronous setup: configs, DB connections, handler registration.
  └───────┬────────┘
          │
          ▼
  ┌────────────────┐
  │  3. onReady()  │  Active work begins: HTTP calls, jobs, signal subscriptions, windows.
  └───────┬────────┘
          │
          ▼
  ┌────────────────┐
  │   APPLICATION  │  Running. User can interact.
  │    RUNNING     │
  └───────┬────────┘
          │  kernel.shutdown()
          ▼
  ┌────────────────┐
  │  4. onShutdown()│  Active work stops: save state, stop jobs, close connections.
  └───────┬────────┘        (called in REVERSE dependency order)
          │
          ▼
  ┌────────────────┐
  │ 5. onDispose() │  Final cleanup: release memory, close file descriptors.
  └────────────────┘        (called in REVERSE dependency order)
```

---

## Hook Reference

Each hook has a specific contract. Violating it leads to fragile startup or shutdown behavior.

### `onInit()`

Called once during the initialization phase, **after** all dependencies have been instantiated.

**Do in `onInit()`:**

- Register Electron event listeners (`app.on(...)`)
- Set up deep-link handlers
- Initialize synchronous resources (in-memory caches, config parsing)
- Prepare the DI container for `onReady()`

**Do NOT in `onInit()`:**

- Make HTTP requests
- Open windows
- Start jobs or subscriptions

```ts
@Module({ id: "auth", providers: [AuthService] })
export class AuthModule {
    async onInit() {
        // Register deep link handler before the app is fully started
        app.on("open-url", async (event, url) => {
            event.preventDefault();
            await inject(AuthService).handleDeepLink(url);
        });
    }
}
```

---

### `onReady()`

Called after `onInit()` completes for all components. This is where active work begins.

**Do in `onReady()`:**

- Make network requests to load initial data
- Start background jobs
- Subscribe to signals
- Show windows

**Do NOT in `onReady()`:**

- Assume other modules have not yet started (they have)
- Create new providers

```ts
@Module({ id: "auth", providers: [AuthService] })
export class AuthModule {
    async onReady() {
        // Signal emission goes through the service, not the module directly
        await inject(AuthService).restoreSession();
    }
}
```

---

### `onShutdown()`

Called on shutdown, in **reverse dependency order**. Modules that depend on others stop first.

**Do in `onShutdown()`:**

- Stop background jobs
- Unsubscribe from signals
- Persist state that must survive the next startup
- Close network connections gracefully

**Errors in `onShutdown()` must not block shutdown.** Catch and log them — never re-throw.

```ts
@Module({ id: "sync", providers: [SyncService] })
export class SyncModule {
    async onShutdown() {
        try {
            await inject(SyncService).savePendingOperations();
        } catch (err) {
            console.error("[SyncModule] Failed to flush pending ops:", err);
        }
    }
}
```

---

### `onDispose()`

Called after `onShutdown()` completes for all components, in **reverse dependency order**. This is the final cleanup.

**Do in `onDispose()`:**

- Close file descriptors
- Release memory
- Finalize any remaining cleanup

**Do NOT in `onDispose()`:**

- Make network requests (the process is about to exit)
- Start any new async work

```ts
@Module({ id: "database", providers: [DatabaseService] })
export class DatabaseModule {
    async onDispose() {
        await inject(DatabaseService).disconnect();
    }
}
```

---

## Execution Order

### Startup — dependency-first

Modules are started **after** all modules they import have started. If `AppModule` imports `AuthModule` which imports `HttpModule`, the order is:

```
HttpModule.onInit()
AuthModule.onInit()
AppModule.onInit()

HttpModule.onReady()
AuthModule.onReady()
AppModule.onReady()
```

### Shutdown — reverse

Shutdown runs in the exact reverse order. The root module stops first, its dependencies stop after.

```
AppModule.onShutdown()
AuthModule.onShutdown()
HttpModule.onShutdown()

AppModule.onDispose()
AuthModule.onDispose()
HttpModule.onDispose()
```

This guarantees that when `AuthModule.onShutdown()` runs, `AppModule` has already stopped and will no longer make calls that depend on `AuthService`.

---

## Lifecycle in Windows and Views

Windows and Views participate in the same lifecycle. Their hooks are called interleaved with module hooks, after the module graph has been fully initialized.

```ts
@Window({ id: "main" })
export class MainWindow {
    async onReady() {
        // All modules are already started here.
        // Safe to load data and show the window.
        inject(MainView).load();
        this.window.show();
    }

    async onShutdown() {
        const bounds = this.window.getBounds();
        await inject(SettingsService).saveWindowBounds(bounds);
    }
}
```

---

## Error Handling

If `onInit()` or `onReady()` throws, the application **will not start**. Re-throwing is the correct behavior for critical failures.

If `onShutdown()` or `onDispose()` throws, it **must be caught**. Never let shutdown hooks throw — the process must exit cleanly.

```ts
async onReady() {
    // Critical — if this fails, the app should not run
    await inject(DatabaseService).connect(); // throws on failure → correct
}

async onShutdown() {
    try {
        await inject(DatabaseService).flush();
    } catch (err) {
        // Non-critical path — log and continue shutdown
        console.error("Flush failed during shutdown:", err);
    }
}
```
