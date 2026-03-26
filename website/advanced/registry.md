---
title: Registry System
---

# Registry System

Electro maintains three runtime registries that provide programmatic access to all registered components. They are useful for dynamic orchestration, health monitoring, and administrative tooling.

---

## Overview

| Registry         | What it tracks                             | Inject token             |
| ---------------- | ------------------------------------------ | ------------------------ |
| `ViewRegistry`   | All `@View` instances                      | `inject(ViewRegistry)`   |
| `WindowRegistry` | All `@Window` instances                    | `inject(WindowRegistry)` |
| `ModuleRegistry` | All `@Module` instances and their metadata | `inject(ModuleRegistry)` |

All three are available anywhere in the runtime via `inject()`. They are populated automatically by the framework during the bootstrap phase — you never add to them manually.

---

## ViewRegistry

Provides access to all runtime views registered via `@View`.

```ts
import { ViewRegistry } from "@electrojs/runtime";

@Injectable()
export class UIService {
    private readonly views = inject(ViewRegistry);

    // Get a view by its id
    getMainView() {
        return this.views.get("main"); // returns MainView instance | undefined
    }

    // Check if a view exists
    hasSettingsView() {
        return this.views.has("settings");
    }

    // Get all registered views
    listAllViews() {
        return this.views.list();
    }

    // Get all views mounted inside a specific window
    getViewsForWindow(windowId: string) {
        return this.views.findByWindow(windowId);
    }
}
```

### ViewRegistry API

| Method                   | Return type         | Description                         |
| ------------------------ | ------------------- | ----------------------------------- |
| `get(id)`                | `View \| undefined` | Find view by id                     |
| `has(id)`                | `boolean`           | Check if view is registered         |
| `list()`                 | `View[]`            | All registered views                |
| `findByWindow(windowId)` | `View[]`            | Views mounted inside a given window |
| `size()`                 | `number`            | Total view count                    |

---

## WindowRegistry

Provides access to all windows registered via `@Window`.

```ts
import { WindowRegistry } from "@electrojs/runtime";

const registry = inject(WindowRegistry);

// Get the main window
const mainWindow = registry.get("main");
mainWindow?.show();

// Focus or restore the main window (common on second-instance)
const main = registry.get("main");
if (main?.isMinimized?.()) {
    main.restore();
} else {
    main?.focus();
}

// Close all secondary windows
registry
    .list()
    .filter((w) => w.id !== "main")
    .forEach((w) => w.close());
```

### WindowRegistry API

| Method                  | Return type           | Description                             |
| ----------------------- | --------------------- | --------------------------------------- |
| `get(id)`               | `Window \| undefined` | Find window by id                       |
| `has(id)`               | `boolean`             | Check if window is registered           |
| `list()`                | `Window[]`            | All registered windows                  |
| `getActive()`           | `Window \| undefined` | The currently focused window            |
| `getChildren(parentId)` | `Window[]`            | Child (modal) windows of a given parent |
| `size()`                | `number`              | Total window count                      |

---

## ModuleRegistry

Provides access to module metadata, dependency relationships, and lifecycle status.

```ts
import { ModuleRegistry } from "@electrojs/runtime";

@Injectable()
export class DiagnosticsService {
    private readonly modules = inject(ModuleRegistry);

    @query()
    getSystemStatus() {
        return this.modules.list().map((m) => ({
            id: m.id,
            status: this.modules.getStatus(m.id),
            imports: this.modules.getImports(m.id),
            exports: this.modules.getExports(m.id),
            providers: this.modules.getProviders(m.id).length,
        }));
    }

    @query()
    isModuleReady(moduleId: string): boolean {
        return this.modules.getStatus(moduleId) === "started";
    }
}
```

### Module Status Values

| Status           | Meaning                                        |
| ---------------- | ---------------------------------------------- |
| `"creating"`     | Provider instantiation in progress             |
| `"initializing"` | `onInit()` running                             |
| `"started"`      | `onReady()` completed — module is fully active |
| `"stopping"`     | `onShutdown()` running                         |
| `"stopped"`      | `onDispose()` completed                        |

### ModuleRegistry API

| Method             | Return type                   | Description                            |
| ------------------ | ----------------------------- | -------------------------------------- |
| `get(id)`          | `ModuleMetadata \| undefined` | Module descriptor by id                |
| `has(id)`          | `boolean`                     | Check if module is registered          |
| `list()`           | `ModuleMetadata[]`            | All registered modules                 |
| `getStatus(id)`    | `ModuleStatus \| undefined`   | Current lifecycle status               |
| `getProviders(id)` | `ProviderMetadata[]`          | Providers declared in this module      |
| `getImports(id)`   | `string[]`                    | Module ids this module imports         |
| `getExports(id)`   | `string[]`                    | Provider names exported by this module |
| `size()`           | `number`                      | Total module count                     |

---

## Common Patterns

### Handle second-instance (Windows/Linux)

```ts
// runtime/main.ts
app.on("second-instance", () => {
    const main = inject(WindowRegistry).get("main");

    if (main?.isMinimized?.()) {
        main.restore();
    }
    main?.focus();
});
```

### Health check job

```ts
@Injectable()
export class HealthService {
    private readonly modules = inject(ModuleRegistry);

    @job({ id: "health:modules", cron: "*/5 * * * *" })
    async checkModules(): Promise<void> {
        for (const module of this.modules.list()) {
            const status = this.modules.getStatus(module.id);
            if (status === "stopped") {
                this.signals.publish("system:module-stopped", { moduleId: module.id });
            }
        }
    }
}
```

### Dynamic dialog management

```ts
@Injectable()
export class DialogService {
    private readonly windows = inject(WindowRegistry);

    @command()
    openDialog(dialogId: string): void {
        const existing = this.windows.get(dialogId);
        if (existing) {
            existing.focus();
            return;
        }
        // create new window via kernel...
    }

    @command()
    closeDialog(dialogId: string): void {
        this.windows.get(dialogId)?.close();
    }

    @query()
    getOpenDialogs() {
        return this.windows
            .list()
            .filter((w) => w.id !== "main")
            .map((w) => ({ id: w.id }));
    }
}
```

---

## Rules

**Use registries for runtime inspection and dynamic orchestration.** They are not a replacement for direct `inject()` calls when you know the exact type at compile time.

**Always check for `undefined` before using a registry result.** `get()` returns `undefined` if the component is not registered or has not yet been initialized.

**Prefer `inject(MainWindow)` over `inject(WindowRegistry).get("main")` when the type is known.** Direct injection gives you the correct TypeScript type and is less error-prone.
