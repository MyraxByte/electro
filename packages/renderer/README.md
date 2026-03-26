# @electrojs/renderer

Typed renderer-side runtime for ElectroJS applications.

Documentation: https://electrojs.myraxbyte.dev/ui/renderer

`@electrojs/renderer` is the only public entrypoint that renderer code uses to talk to the ElectroJS runtime. It exposes:

- `ElectroRenderer.initialize(...)` — bootstraps the renderer package
- `bridge` — typed query/command API
- `signals` — typed runtime-to-renderer subscriptions

This package does **not** know anything about preload implementation details beyond the public preload contract exposed on `window.__ELECTRO_RENDERER__`. The preload side is provided by the runtime layer.

---

## Installation

```bash
npm install @electrojs/renderer
```

---

## Core idea

The renderer cannot talk to the runtime directly. All communication goes through:

- `bridge.<module>.<method>(...)` for queries and commands
- `signals.subscribe(...)` / `signals.once(...)` for runtime-published signals

Bridge and signal types are provided through declaration merging.

---

## Quick start

```ts
import { ElectroRenderer } from "@electrojs/renderer";
import { createRoot } from "react-dom/client";
import { App } from "./app";

await ElectroRenderer.initialize(async () => {
    createRoot(document.getElementById("root")!).render(<App />);
});
```

After initialization finishes, `bridge` and `signals` are ready to use.

---

## Public API

### `ElectroRenderer.initialize(callback?)`

Initializes the renderer package exactly once.

```ts
import { ElectroRenderer } from "@electrojs/renderer";

await ElectroRenderer.initialize(async () => {
    // renderer bootstrap logic
});
```

#### Behavior

- resolves the preload API from `window.__ELECTRO_RENDERER__`
- creates the bridge proxy
- creates the signals client
- executes the optional callback
- marks the renderer as initialized only after callback success

#### Important rules

- `initialize()` can only be called once
- if initialization fails, internal state is rolled back
- `bridge` and `signals` must not be used before initialization completes

---

### `bridge`

`bridge` is a lazily resolved typed proxy.

```ts
import { bridge } from "@electrojs/renderer";

const user = await bridge.auth.getMe();
await bridge.auth.login("john@example.com", "secret");
```

At runtime, bridge calls are translated into channel invocations:

```ts
bridge.auth.login("a", "b");
// -> preload.invoke("auth:login", ["a", "b"])
```

#### Method calling rules

A bridge method can have one of three shapes depending on generated types:

- no input:

```ts
await bridge.auth.getMe();
```

- tuple input:

```ts
await bridge.auth.login(email, password);
```

- single object input:

```ts
await bridge.project.create({ name: "Electro" });
```

---

### `signals`

`signals` provides typed subscription helpers.

```ts
import { signals } from "@electrojs/renderer";

const subscription = signals.subscribe("auth:user-logged-in", (payload) => {
    console.log(payload);
});

subscription.unsubscribe();
```

One-time subscription:

```ts
signals.once("auth:user-logged-in", (payload) => {
    console.log("received once", payload);
});
```

Signal handlers support two shapes:

- payload signal:

```ts
signals.subscribe("auth:user-logged-in", (payload) => {
    console.log(payload.userId);
});
```

- no-payload signal:

```ts
signals.subscribe("auth:user-logged-out", () => {
    console.log("logged out");
});
```

---

## Typing bridge and signals

This package exposes three empty interfaces intended for declaration merging:

```ts
export interface BridgeQueries {}
export interface BridgeCommands {}
export interface BridgeSignals {}
```

Generated code augments them.

Example:

```ts
declare module "@electrojs/renderer" {
    interface BridgeQueries {
        "auth:getMe": {
            input: undefined;
            output: { id: string; email: string } | null;
        };
    }

    interface BridgeCommands {
        "auth:login": {
            input: [email: string, password: string];
            output: void;
        };
    }

    interface BridgeSignals {
        "auth:user-logged-in": { userId: string };
        "auth:user-logged-out": undefined;
    }
}
```

After augmentation:

```ts
const me = await bridge.auth.getMe();
await bridge.auth.login("john@example.com", "secret");

signals.subscribe("auth:user-logged-in", (payload) => {
    payload.userId;
});

signals.subscribe("auth:user-logged-out", () => {});
```

---

## Runtime preload contract

The renderer expects preload to expose this API on `window.__ELECTRO_RENDERER__`:

```ts
interface RendererPreloadApi {
    invoke(channel: string, payload: readonly unknown[]): Promise<unknown>;
    subscribe(signalKey: string, listener: (payload: unknown) => void): () => void;
    once(signalKey: string, listener: (payload: unknown) => void): () => void;
}
```

This package does not create that object. It only consumes it.

---

## Usage with React

```tsx
import { useEffect, useState } from "react";
import { bridge, signals } from "@electrojs/renderer";

export function App(): JSX.Element {
    const [email, setEmail] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        bridge.auth.getMe().then((user) => {
            if (!mounted) {
                return;
            }

            setEmail(user?.email ?? null);
        });

        const subscription = signals.subscribe("auth:user-logged-in", (payload) => {
            setEmail(payload.email);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    return <div>{email ?? "Anonymous"}</div>;
}
```

---

## Errors

All package-specific errors inherit from `RendererError`.

### `RendererInitializationError`

Thrown when initialization fails or is used incorrectly.

Examples:

- `ELECTRO_RENDERER_ALREADY_INITIALIZED`
- `ELECTRO_RENDERER_PRELOAD_API_MISSING`

### `RendererUsageError`

Thrown when renderer APIs are used incorrectly.

Examples:

- `ELECTRO_RENDERER_NOT_INITIALIZED`
- `ELECTRO_RENDERER_INVALID_BRIDGE_NAMESPACE_KEY`
- `ELECTRO_RENDERER_INVALID_BRIDGE_METHOD_KEY`
- `ELECTRO_RENDERER_INVALID_SIGNAL_KEY`
- `ELECTRO_RENDERER_INVALID_SIGNAL_HANDLER`

### `RendererTransportError`

Thrown when preload transport operations fail.

Examples:

- `ELECTRO_RENDERER_TRANSPORT_INVOKE_FAILED`
- `ELECTRO_RENDERER_SIGNAL_SUBSCRIBE_FAILED`

Example:

```ts
import { ElectroRenderer, RendererInitializationError } from "@electrojs/renderer";

try {
    await ElectroRenderer.initialize();
} catch (error) {
    if (error instanceof RendererInitializationError) {
        console.error(error.code, error.context);
    }
}
```

---

## Initialization lifecycle

Initialization is transactional.

### Successful flow

1. validate initialization state
2. resolve preload API from `window.__ELECTRO_RENDERER__`
3. create bridge transport
4. create bridge proxy
5. create signals client
6. store bridge and signals
7. run user callback
8. mark initialized

### Failed flow

If any step throws:

- bridge storage is cleared
- signals storage is cleared
- initialization state is reset
- original error is rethrown

This guarantees the package never stays in a half-initialized state.

---

## Design notes

### Why `initialize()` is async

Initialization may include async renderer bootstrap logic:

```ts
await ElectroRenderer.initialize(async () => {
    await loadI18n();
    await warmupCache();
    renderApp();
});
```

The renderer becomes initialized only after this callback succeeds.

---

### Why `bridge` is a proxy

The runtime bridge surface is generated and typed externally. A proxy lets the package:

- expose ergonomic `bridge.auth.login(...)` syntax
- avoid static hardcoded namespaces
- remain compatible with generated declaration merging

---

### Why `"then"` returns `undefined`

Both root and namespace proxies explicitly return `undefined` for `"then"` to avoid accidental promise-like behavior during inspection or framework interop.

---

## Exports

```ts
import { bridge, signals, ElectroRenderer, RendererError, RendererInitializationError, RendererTransportError, RendererUsageError } from "@electrojs/renderer";
```

Type exports:

```ts
import type {
    BridgeContractEntry,
    BridgeSignalHandler,
    ElectroRendererApi,
    InitializeCallback,
    RendererPreloadApi,
    RendererSignalListener,
    RendererSignalSubscription,
} from "@electrojs/renderer";
```

---

## Best practices

Always initialize the renderer before using `bridge` or `signals`.

```ts
await ElectroRenderer.initialize(async () => {
    // safe to render app here
});
```

Always unsubscribe from long-lived signal subscriptions.

```ts
const subscription = signals.subscribe("project:updated", onProjectUpdated);

// later
subscription.unsubscribe();
```

Prefer generated types over handwritten declarations.

Keep preload implementation thin and transport-focused. Business logic belongs in the runtime, not in preload.

---

## Browser requirement

`@electrojs/renderer` expects a browser-like environment with a `window` global.

Running tests in plain Node.js without browser mode or DOM emulation will fail for code paths that access `window`.
