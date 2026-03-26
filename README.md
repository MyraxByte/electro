# ElectroJS Documentation

> A TypeScript framework for building structured, type-safe Electron desktop applications.

---

## What is Electro?

ElectroJS brings the architectural patterns found in server-side frameworks — modules, dependency injection, lifecycle hooks, typed IPC — to the Electron ecosystem. It is designed for applications where maintainability, type safety, and long-term scalability matter.

If you have worked with NestJS, the mental model will feel familiar. The key difference is that ElectroJS targets **Electron desktop apps** rather than HTTP servers, and the "API layer" is a typed IPC bridge between the main process and your renderer views.

---

## Core Ideas

**Two execution environments, one typed contract.**
Your business logic runs in Node.js (the Runtime). Your UI runs in a sandboxed browser context (the Renderer). The Bridge connects them with a fully typed API that is automatically generated from your service code.

**Modules enforce boundaries.**
Every feature belongs to a module. Modules declare what they import and what they export. Nothing leaks across boundaries accidentally.

**Lifecycle-aware.**
Every module, view, and window participates in a consistent `onInit → onReady → onShutdown → onDispose` lifecycle. Resource management is predictable and explicit.

**Inject everything.**
Dependencies are resolved synchronously through `inject()`. No constructors. No service locator antipatterns. The DI system is hierarchical and scoped per module.

---

## Documentation

### Start Here

|                                              |                                             |
| -------------------------------------------- | ------------------------------------------- |
| [Introduction](./docs/introduction.md)       | Architecture overview, key concepts         |
| [Getting Started](./docs/getting-started.md) | Bootstrap a working application in minutes  |
| [Application Lifecycle](./docs/lifecycle.md) | Phase order, hook contracts, error handling |

### Core Architecture

|                                                        |                                                                |
| ------------------------------------------------------ | -------------------------------------------------------------- |
| [Modules](./docs/modules.md)                           | Domain boundaries, imports/exports, inter-module communication |
| [Services & Providers](./docs/providers.md)            | `@Injectable`, `@query`, `@command`, state patterns            |
| [Dependency Injection](./docs/dependency-injection.md) | `inject()`, tokens, scopes, injector hierarchy                 |

### UI System

|                                                 |                                              |
| ----------------------------------------------- | -------------------------------------------- |
| [Windows](./docs/windows.md)                    | Electron windows, mounting views, layout     |
| [Views — Runtime Side](./docs/views-runtime.md) | `@View` decorator, access control            |
| [Renderer — Frontend Side](./docs/renderer.md)  | Vite config, `bridge`, bootstrapping         |
| [Bridge API](./docs/bridge.md)                  | Queries, commands, signals from the frontend |

### Messaging & Background Work

|                              |                                                   |
| ---------------------------- | ------------------------------------------------- |
| [Signals](./docs/signals.md) | Typed events, cross-module and Runtime → Renderer |
| [Jobs](./docs/jobs.md)       | Background tasks, cron scheduling, cancellation   |

### Advanced

|                                            |                                              |
| ------------------------------------------ | -------------------------------------------- |
| [Registry System](./docs/registry.md)      | Runtime introspection, dynamic orchestration |
| [Code Generation](./docs/codegen.md)       | How the typed Bridge is produced             |
| [Build Pipeline](./docs/build-pipeline.md) | Dev, preview, production builds              |

---

## Quick Example

A complete, minimal application:

```ts
// runtime/modules/app.module.ts
@Module({ imports: [AuthModule] })
export class AppModule {}

// runtime/modules/auth/auth.service.ts
@Injectable()
export class AuthService {
    @query()
    async getMe(): Promise<User | null> {
        return inject(AuthState).getCurrentUser();
    }

    @command()
    async login(email: string, password: string): Promise<void> {
        const user = await inject(HttpService).post("/auth/login", { email, password });
        inject(AuthState).setSession(user);
        this.signals.publish("auth:user-logged-in", { user, isNew: false });
    }
}

// runtime/views/main.view.ts
@View({
    id: "main",
    resource: "view:main",
    access: ["auth:getMe", "auth:login"],
    signals: ["auth:user-logged-in"],
})
export class MainView {}

// runtime/windows/main.window.ts
@Window({ id: "main" })
export class MainWindow {
    register() {
        this.create();
        const view = inject(MainView);
        this.mount(view);
        view.webContents.once("did-finish-load", () => this.window.show());
    }
}

// renderer/views/main/app.tsx
function App() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        bridge.auth.getMe().then(setUser);
        const sub = bridge.signals.subscribe("auth:user-logged-in", ({ user }) => setUser(user));
        return () => sub.unsubscribe();
    }, []);

    return user ? <Dashboard user={user} /> : <LoginForm />;
}
```
