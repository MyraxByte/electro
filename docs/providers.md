# Services & Providers

A **Provider** is any class decorated with `@Injectable`. Providers are the primary home for business logic, state management, networking, and any other runtime functionality.

---

## Defining a Provider

```ts
import { Injectable } from "@electrojs/common";
import { inject } from "@electrojs/runtime";

@Injectable()
export class AuthService {
    private http = inject(HttpService);
    private state = inject(AuthState);
    private signals = inject(SignalBus);

    async getMe() {
        return this.state.getCurrentUser();
    }

    async login(email: string, password: string) {
        const session = await this.http.post("/api/auth/login", { email, password });
        this.state.setSession(session);
        this.signals.publish("auth:user-logged-in", session);
    }
}
```

Dependencies are resolved via `inject()` — declared as property initializers. There is no constructor injection in Electro.

---

## The Bridge: `@query` and `@command`

Providers communicate with the Renderer through the Bridge. Two decorators control which methods are exposed:

| Decorator    | Semantics                | Renderer can...              |
| ------------ | ------------------------ | ---------------------------- |
| `@query()`   | Read-only data retrieval | Call it to fetch data        |
| `@command()` | State-mutating operation | Call it to trigger an action |

Methods without `@query` or `@command` are **private to the runtime** — the Renderer cannot call them.

### `@query` — Read Operations

A query method must not produce side effects. It reads and returns data.

```ts
@Injectable()
export class UserService {
    private state = inject(UserState);

    @query()
    async getMe(): Promise<User | null> {
        return this.state.getCurrentUser();
    }

    @query()
    async getUserById(id: string): Promise<User | null> {
        return this.state.findById(id);
    }

    @query()
    async searchUsers(query: string): Promise<User[]> {
        return this.http.get(`/api/users/search?q=${encodeURIComponent(query)}`);
    }
}
```

From the Renderer:

```ts
const me = await bridge.user.getMe();
const results = await bridge.user.searchUsers("alice");
```

### `@command` — Mutating Operations

A command method may change state, make writes, emit signals, and return a result.

```ts
@Injectable()
export class UserService {
    private readonly http = inject(HttpService);
    private readonly state = inject(UserState);
    private readonly signals = inject(SignalBus);

    @command()
    async updateProfile(data: UpdateProfileInput): Promise<User> {
        const updated = await this.http.patch("/api/account/profile", data);
        this.state.setUser(updated);
        this.signals.publish("user:profile-updated", updated);
        return updated;
    }

    @command()
    async deleteAccount(): Promise<void> {
        await this.http.delete("/api/account");
        this.state.clearSession();
        this.signals.publish("auth:user-logged-out", undefined);
    }
}
```

From the Renderer:

```ts
const updated = await bridge.user.updateProfile({ name: "Alice" });
await bridge.user.deleteAccount();
```

---

## Provider Types

### Business Logic Service

The most common type. Orchestrates HTTP calls, state updates, and signal emission.

```ts
@Injectable()
export class ProjectService {
    private http = inject(HttpService);
    private state = inject(ProjectState);
    private signals = inject(SignalBus);

    @query()
    async getProjects(): Promise<Project[]> {
        return this.http.get("/api/projects");
    }

    @command()
    async createProject(name: string, description: string): Promise<Project> {
        const project = await this.http.post("/api/projects", { name, description });
        this.state.addProject(project);
        this.signals.publish("project:created", project);
        return project;
    }

    @command()
    async deleteProject(id: string): Promise<void> {
        await this.http.delete(`/api/projects/${id}`);
        this.state.removeProject(id);
        this.signals.publish("project:deleted", id);
    }
}
```

### State Provider

Holds in-memory state for a domain. Typically not exposed through the Bridge — consumed by other services in the same module.

```ts
@Injectable()
export class AuthState {
    private user: User | null = null;
    private sessionToken: string | null = null;

    setSession(user: User, token: string) {
        this.user = user;
        this.sessionToken = token;
    }

    clearSession() {
        this.user = null;
        this.sessionToken = null;
    }

    getCurrentUser() {
        return this.user;
    }
    getToken() {
        return this.sessionToken;
    }
    hasSession() {
        return this.user !== null;
    }
}
```

### HTTP / Network Service

A singleton wrapper around fetch or a native HTTP client. Typically lives in `HttpModule` and is exported for the whole app.

```ts
@Injectable()
export class HttpService {
    private readonly baseUrl = inject(ConfigService).getApiUrl();
    private readonly auth = inject(AuthState);

    async get<T>(path: string): Promise<T> {
        const res = await fetch(`${this.baseUrl}${path}`, {
            headers: this.buildHeaders(),
        });
        if (!res.ok) throw new HttpError(res.status, await res.text());
        return res.json() as Promise<T>;
    }

    async post<T>(path: string, body: unknown): Promise<T> {
        const res = await fetch(`${this.baseUrl}${path}`, {
            method: "POST",
            headers: this.buildHeaders(),
            body: JSON.stringify(body),
        });
        if (!res.ok) throw new HttpError(res.status, await res.text());
        return res.json() as Promise<T>;
    }

    private buildHeaders(): Record<string, string> {
        const token = this.auth.getToken();
        return {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
    }
}
```

---

## Provider Scopes

By default, every provider is a **singleton** — one instance per DI context. You can override this:

| Scope         | Behavior                                 | Use case                                  |
| ------------- | ---------------------------------------- | ----------------------------------------- |
| `"singleton"` | One instance for the lifetime of the app | Services, stateless helpers, HTTP clients |
| `"transient"` | New instance every time it is injected   | Short-lived stateful objects, form state  |

```ts
@Injectable({ scope: "singleton" }) // default
export class HttpService {}

@Injectable({ scope: "transient" })
export class FormValidationContext {}
```

> **Warning:** Do not use `singleton` for stateful objects that differ per user or per action. A shared mutable singleton creates subtle bugs that are hard to trace.

---

## Best Practices

### Separate state from logic

```ts
// ✅ Correct: distinct responsibilities
@Injectable()
export class AuthState {
    /* holds data */
}
@Injectable()
export class AuthService {
    /* orchestrates logic */
}

// ❌ Avoid: mixed concerns
@Injectable()
export class AuthManager {
    private users = new Map(); // state
    async login() {
        /* logic */
    } // logic — tangled together
}
```

### Emit signals after every mutation

```ts
// ✅ Correct: Renderer is notified of changes
@Injectable()
export class UserService {
    private readonly http    = inject(HttpService);
    private readonly state   = inject(UserState);
    private readonly signals = inject(SignalBus);

    @command()
    async updateUser(id: string, data: UpdateUserInput) {
        const user = await this.http.patch(`/api/users/${id}`, data);
        this.state.updateUser(user);
        this.signals.publish("user:updated", user);  // ← essential
        return user;
    }
}

// ❌ Wrong: Renderer never learns the user changed
@command()
async updateUser(id: string, data: UpdateUserInput) {
    const user = await this.http.patch(`/api/users/${id}`, data);
    this.state.updateUser(user);
    return user;  // no signal → UI goes stale
}
```

### Never mutate state inside `@query`

```ts
// ✅ Correct: pure read
@query()
async getUser(id: string) {
    return this.state.findById(id);
}

// ❌ Wrong: side effect inside a query
@query()
async getUser(id: string) {
    const user = this.state.findById(id);
    user.viewCount++;     // ← mutating inside a query breaks the contract
    return user;
}
```
