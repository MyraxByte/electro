---
title: Signals
---

# Signals

Signals are a typed, one-way event system for broadcasting notifications within the Runtime and to Renderer views. They decouple the sender from the receiver — a service that publishes a signal has no knowledge of who is listening.

---

## Core Properties

| Property            | Description                                                              |
| ------------------- | ------------------------------------------------------------------------ |
| **One-way**         | Runtime → Renderer, or Runtime → Runtime. Renderers cannot emit signals. |
| **Typed**           | Every signal key has a declared payload type, enforced by codegen.       |
| **Decoupled**       | Publishers and subscribers do not reference each other.                  |
| **Fire-and-forget** | Delivery is asynchronous. The publisher does not wait for subscribers.   |

---

## Where Signals Are Available

`SignalBus` can only be injected in:

| Context                 | Available |
| ----------------------- | --------- |
| `@Injectable()` service | ✅        |
| `@View()` runtime class | ✅        |
| `@Window()` class       | ✅        |
| `@Module()` class       | ❌        |

`@Module` does **not** have access to `SignalBus`. If a module needs to react to or emit signals, that logic belongs in a service declared inside that module.

---

## Publishing Signals

Inject `SignalBus` and call `publish()`.

```ts
import { Injectable, command } from "@electrojs/common";
import { inject } from "@electrojs/runtime";
import { SignalBus } from "@electrojs/runtime";

@Injectable()
export class AuthService {
    private readonly signals = inject(SignalBus);
    private readonly http = inject(HttpService);
    private readonly state = inject(AuthState);

    @command()
    async login(email: string, password: string): Promise<void> {
        const { user, isNew } = await this.http.post("/api/auth/login", { email, password });
        this.state.setSession(user);

        // Broadcast to all listeners in the runtime and to subscribed renderer views
        this.signals.publish("auth:user-logged-in", { user, isNew });
    }

    @command()
    async logout(): Promise<void> {
        await this.http.post("/api/auth/logout");
        this.state.clearSession();
        this.signals.publish("auth:user-logged-out", undefined);
    }
}
```

The convention for signal keys is `<module-id>:<event-name>`, e.g. `"auth:user-logged-in"`.

---

## Handling Signals with `@signal`

The `@signal` decorator marks a method as a **signal handler**. The runtime calls this method automatically whenever the specified signal is published.

The method receives two arguments:

| Parameter | Type            | Description                        |
| --------- | --------------- | ---------------------------------- |
| `context` | `SignalContext` | Execution context (see below)      |
| `payload` | `T`             | The data published with the signal |

```ts
import { Injectable, signal } from "@electrojs/common";
import { inject } from "@electrojs/runtime";
import { SignalContext } from "@electrojs/runtime";

@Injectable()
export class WorkspaceService {
    private readonly state = inject(WorkspaceState);

    @signal({ id: "auth:user-logged-in" })
    async onUserLoggedIn(context: SignalContext, payload: { user: User; isNew: boolean }): Promise<void> {
        await this.loadForUser(payload.user.id);
    }

    @signal({ id: "auth:user-logged-out" })
    async onUserLoggedOut(context: SignalContext, _payload: undefined): Promise<void> {
        this.state.clear();
    }
}
```

`@signal` handlers are registered automatically when the service is instantiated. No manual subscription call is needed.

---

## `SignalContext`

| Property     | Type      | Description                              |
| ------------ | --------- | ---------------------------------------- |
| `isCanceled` | `boolean` | `true` if the handler should abort early |

```ts
@signal({ id: "project:bulk-sync" })
async onBulkSync(
    context: SignalContext,
    payload: { projectIds: string[] },
): Promise<void> {
    for (const id of payload.projectIds) {
        if (context.isCanceled) return;   // ← respect cancellation in loops
        await this.syncProject(id);
    }
}
```

---

## Subscribing in the Renderer

In Renderer code, subscribe via `signals`. Always unsubscribe on cleanup.

```tsx
import { useEffect } from "react";
import { signals } from "@electrojs/renderer";

function AppShell() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const subs = [
            signals.subscribe("auth:user-logged-in", ({ user, isNew }) => {
                setUser(user);
                if (isNew) showWelcomeModal();
            }),
            signals.subscribe("auth:user-logged-out", () => {
                setUser(null);
            }),
        ];

        return () => subs.forEach((s) => s.unsubscribe());
    }, []);

    return user ? <MainLayout user={user} /> : <LoginPage />;
}
```

A renderer view only receives signals that are declared in its `@View({ signals: [...] })` list.

---

## How Codegen Uses `@signal`

The codegen tool scans all `@signal` decorated methods and reads the **second parameter's type** to produce the `BridgeSignals` interface.

```ts
// Handler — codegen reads the second parameter type
@signal({ id: "project:created" })
async onProjectCreated(ctx: SignalContext, payload: Project): Promise<void> {
    inject(ProjectState).cacheProject(payload);
}

// Codegen emits:
// BridgeSignals["project:created"] = Project
```

The payload type is defined **exactly once** — in the handler. There is no separate declaration step. Always annotate the payload parameter explicitly; if it is inferred as `any`, the generated bridge type will also be `any`.

---

## Full Flow Example

```ts
// 1. AuthService publishes after a successful login
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

// 2. WorkspaceService reacts via @signal
@Injectable()
export class WorkspaceService {
    @signal({ id: "auth:user-logged-in" })
    async onUserLoggedIn(ctx: SignalContext, payload: { user: User; isNew: boolean }): Promise<void> {
        await this.loadForUser(payload.user.id);
    }
}

// 3. Renderer reacts via signals
function AppShell() {
    useEffect(() => {
        const sub = signals.subscribe("auth:user-logged-in", ({ user, isNew }) => {
            setCurrentUser(user);
            navigate(isNew ? "/welcome" : "/dashboard");
        });
        return () => sub.unsubscribe();
    }, []);
}
```

---

## Best Practices

**Publish after the operation completes** — listeners read consistent state:

```ts
// ✅ State is set before signal fires
this.state.setSession(user);
this.signals.publish("auth:user-logged-in", { user, isNew });

// ❌ Listeners may read stale state
this.signals.publish("auth:user-logged-in", { user, isNew });
this.state.setSession(user);
```

**Always type the payload parameter explicitly** — codegen depends on it:

```ts
// ✅ Codegen produces: BridgeSignals["project:created"] = Project
@signal({ id: "project:created" })
async onCreated(ctx: SignalContext, payload: Project): Promise<void> {}

// ❌ Codegen produces: BridgeSignals["project:created"] = any
@signal({ id: "project:created" })
async onCreated(ctx: SignalContext, payload): Promise<void> {}
```

**Use namespaced keys** to avoid collisions: `"auth:user-logged-in"` not `"userLoggedIn"`.

**Keep payloads serializable.** They cross the IPC boundary as JSON. Do not pass class instances, functions, `Date` objects (use ISO strings), `Map`, `Set`, or circular references.

**Never put signal logic in `@Module`.** `SignalBus` is not injectable there. Move it into a service.
