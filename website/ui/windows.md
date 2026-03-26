---
title: Windows
---

# Windows

A Window is an Electron `BaseWindow` managed by the ElectroJS runtime. It hosts one or more Views (WebContentsView), participates in the application lifecycle, and is accessible anywhere in the runtime via DI.

---

## Defining a Window

Use the `@Window` decorator. Every window must have a unique `id`.

```ts
import { Window } from "@electrojs/common";
import { inject } from "@electrojs/runtime";
import { MainView } from "../views/main.view";

@Window({ id: "main" })
export class MainWindow {
    // The underlying Electron BaseWindow — available after create()
    protected window: BaseWindow;

    register() {
        // 1. Create the Electron window
        this.create();

        // 2. Resolve the View
        const view = inject(MainView);

        // 3. Mount the View into this window
        this.mount(view);

        // 4. Show when the renderer is ready
        view.webContents.once("did-finish-load", () => {
            this.window.show();
        });
    }
}
```

---

## Built-in Methods

These methods are provided by the framework on every Window class:

| Method             | Description                                        |
| ------------------ | -------------------------------------------------- |
| `this.create()`    | Creates the underlying Electron `BaseWindow`       |
| `this.mount(view)` | Attaches a View's `WebContentsView` to this window |
| `this.window`      | The raw Electron `BaseWindow` instance             |
| `show()`           | Shows the window                                   |
| `hide()`           | Hides the window                                   |
| `close()`          | Closes the window                                  |
| `focus()`          | Focuses the window                                 |

---

## Lifecycle Hooks

Windows participate in the full lifecycle. Use `onReady()` for logic that runs once the app is fully initialized, and `onShutdown()` to persist window state before shutdown.

```ts
@Window({ id: "main" })
export class MainWindow {
    private readonly auth = inject(AuthService);
    private readonly settings = inject(SettingsService);

    async onReady() {
        const session = await this.auth.getMe();

        if (!session) {
            // Redirect unauthenticated users to the auth window
            inject(AuthWindow).show();
            return;
        }

        this.show();
    }

    async onShutdown() {
        // Persist window geometry for next launch
        const bounds = this.window.getBounds();
        await this.settings.saveWindowBounds("main", bounds);
    }
}
```

---

## Managing Multiple Views

A single Window can host multiple Views laid out manually with `setBounds`.

```ts
@Window({ id: "main" })
export class MainWindow {
    register() {
        this.create();

        const mainView = inject(MainView);
        const sidebarView = inject(SidebarView);

        this.mount(mainView);
        this.mount(sidebarView);

        const layout = () => {
            const { width, height } = this.window.getBounds();
            const sidebarWidth = 240;

            sidebarView.setBounds({ x: 0, y: 0, width: sidebarWidth, height });
            mainView.setBounds({ x: sidebarWidth, y: 0, width: width - sidebarWidth, height });
        };

        mainView.webContents.once("did-finish-load", () => {
            layout();
            this.window.show();
        });

        this.window.on("resize", layout);
    }
}
```

---

## Accessing Windows from Other Code

All registered windows are available via `WindowRegistry` or direct injection.

```ts
// Direct injection — preferred when you know the window type
const mainWindow = inject(MainWindow);
mainWindow.show();

// Registry — useful when working with window IDs dynamically
const registry = inject(WindowRegistry);
const mainWindow = registry.get("main");
mainWindow?.show();

// Check existence
if (registry.has("settings")) {
    registry.get("settings")?.focus();
}

// All open windows
const all = registry.list();
```

---

## Example: Splash Screen

A common pattern is showing a splash screen while the app loads, then transitioning to the main window.

```ts
// runtime/windows/splash.window.ts
@Window({ id: "splash" })
export class SplashWindow {
    private readonly updater = inject(UpdaterService);

    register() {
        this.create();

        const view = inject(SplashView);
        this.mount(view);

        view.webContents.once("did-finish-load", () => {
            this.window.show();
        });
    }

    async onReady() {
        await this.updater.checkForUpdates();
    }
}

// runtime/windows/main.window.ts
@Window({ id: "main" })
export class MainWindow {
    async onReady() {
        // Listen for the updater to signal readiness
        this.signals.subscribe("updater:ready", () => {
            inject(SplashWindow).hide();
            this.show();
        });
    }
}
```

---

## Example: Auth Gate

Redirect to an auth window if no session exists.

```ts
@Window({ id: "main" })
export class MainWindow {
    private readonly auth = inject(AuthService);

    async onReady() {
        const user = await this.auth.getMe();

        if (!user) {
            inject(AuthWindow).show();
            return; // do not show main window
        }

        this.show();
    }
}

@Window({ id: "auth" })
export class AuthWindow {
    register() {
        this.create();

        const view = inject(AuthView);
        this.mount(view);

        view.webContents.once("did-finish-load", () => {
            // Auth window stays hidden until explicitly shown
        });
    }

    async onShutdown() {
        await inject(AuthService).logout();
    }
}
```

---

## Window vs. View

|                        | Window                       | View (runtime)                |
| ---------------------- | ---------------------------- | ----------------------------- |
| **Electron primitive** | `BaseWindow`                 | `WebContentsView`             |
| **Purpose**            | Container and layout manager | Renders UI                    |
| **Visibility**         | Visible on the OS desktop    | Visible inside a Window       |
| **Can host**           | Multiple Views               | One frontend app              |
| **DI access**          | Full access to all providers | Configured via `@View`        |
| **Instances**          | Typically one per window     | Typically one per domain area |

A Window without a View shows nothing. A View without a Window cannot be displayed. They are designed to work together.
