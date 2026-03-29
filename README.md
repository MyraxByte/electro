# ElectroJS

> A TypeScript framework for building structured, type-safe Electron desktop applications.

Documentation: https://electrojs.myraxbyte.dev/

> [!NOTE]
> If you find a bug or something feels off, feel free to open an [issue](https://github.com/MyraxByte/ElectroJS/issues).
> You won't bother me by reporting it — I'll look into it and fix what I can when possible.

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
Every module, view, and window participates in a consistent `onInit → onStart → onReady → onShutdown → onDispose` lifecycle. Resource management is predictable and explicit.

**Inject everything.**
Dependencies are resolved synchronously through `inject()`. No constructors. No service locator antipatterns. The DI system is hierarchical and scoped per module.

---

## Documentation

### Start Here

|                                                                          |                                             |
| ------------------------------------------------------------------------ | ------------------------------------------- |
| [Introduction](https://electrojs.myraxbyte.dev/guide/introduction)       | Architecture overview, key concepts         |
| [Getting Started](https://electrojs.myraxbyte.dev/guide/getting-started) | Bootstrap a working application in minutes  |
| [Application Lifecycle](https://electrojs.myraxbyte.dev/core/lifecycle)  | Phase order, hook contracts, error handling |

### Core Architecture

|                                                                                   |                                                                |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [Modules](https://electrojs.myraxbyte.dev/core/modules)                           | Domain boundaries, imports/exports, inter-module communication |
| [Services & Providers](https://electrojs.myraxbyte.dev/core/providers)            | `@Injectable`, `@query`, `@command`, state patterns            |
| [Dependency Injection](https://electrojs.myraxbyte.dev/core/dependency-injection) | `inject()`, tokens, scopes, injector hierarchy                 |

### UI System

|                                                                         |                                              |
| ----------------------------------------------------------------------- | -------------------------------------------- |
| [Windows](https://electrojs.myraxbyte.dev/ui/windows)                   | Electron windows, mounting views, layout     |
| [Views — Runtime Side](https://electrojs.myraxbyte.dev/ui/views)        | `@View` decorator, access control            |
| [Renderer — Frontend Side](https://electrojs.myraxbyte.dev/ui/renderer) | Vite config, `bridge`, bootstrapping         |
| [Bridge API](https://electrojs.myraxbyte.dev/ui/bridge)                 | Queries, commands, signals from the frontend |

### Messaging & Background Work

|                                                         |                                                   |
| ------------------------------------------------------- | ------------------------------------------------- |
| [Signals](https://electrojs.myraxbyte.dev/core/signals) | Typed events, cross-module and Runtime → Renderer |
| [Jobs](https://electrojs.myraxbyte.dev/core/jobs)       | Background tasks, cron scheduling, cancellation   |

### Advanced

|                                                                      |                                              |
| -------------------------------------------------------------------- | -------------------------------------------- |
| [Registry System](https://electrojs.myraxbyte.dev/advanced/registry) | Runtime introspection, dynamic orchestration |
| [Code Generation](https://electrojs.myraxbyte.dev/advanced/codegen)  | How the typed Bridge is produced             |
| [Build Pipeline](https://electrojs.myraxbyte.dev/guide/dev-workflow) | Dev, preview, production builds              |

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
