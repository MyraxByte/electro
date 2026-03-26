# @electrojs/common

Foundational runtime-agnostic primitives for Electro.

`@electrojs/common` contains the shared contracts and low-level building blocks used by the rest of the framework:

- class decorators such as `@Module()`, `@Injectable()`, `@View()`, `@Window()`
- method decorators such as `@command()`, `@query()`, `@job()`, `@signal()`
- metadata keys, helpers, and accessors
- DI token, provider, and reference primitives
- strict validation and framework-specific error types
- small immutable utility helpers

This package intentionally does **not** implement the runtime container, bridge transport, window lifecycle, or renderer execution. It defines the stable primitives that higher-level ElectroJS packages consume.

---

## Installation

```bash
npm install @electrojs/common
```

---

## What this package is for

Use `@electrojs/common` when you need to:

- declare modules and providers
- describe runtime views and windows
- mark methods as commands, queries, jobs, or signals
- create typed DI tokens
- define provider declarations in a strict and framework-friendly way
- inspect ElectroJS metadata from runtime code, tooling, or code generation

This package is the shared language of the framework.

---

## Exports

```ts
import { Module, Injectable, View, Window, command, query, job, signal, SetMetadata, apply, Ref, createInjectionToken } from "@electrojs/common";
```

It also exports:

- metadata helpers and accessors
- DI provider and token types
- framework-specific error classes
- public shared types

---

## Quick example

```ts
import { Injectable, Module, View, Window, command, query } from "@electrojs/common";

@Injectable()
class AuthService {
    @query()
    public getMe(): { id: string } | null {
        return null;
    }

    @command({ id: "auth:login" })
    public login(email: string, password: string): void {
        void email;
        void password;
    }
}

@Module({
    id: "auth",
    providers: [AuthService],
    exports: [AuthService],
})
class AuthModule {}

@View({
    source: "view:main",
    access: ["auth:getMe", "auth:login"],
    signals: [],
})
class MainView {}

@Window({ id: "main" })
class MainWindow {}
```

---

## Decorators

## `@Injectable()`

Marks a class as a provider that can be managed by the runtime.

```ts
import { Injectable } from "@electrojs/common";

@Injectable()
class AuthService {}

@Injectable({ scope: "transient" })
class RequestContext {}
```

### Options

- `scope?: "singleton" | "transient"`

If omitted, scope defaults to `"singleton"`.

### Stored metadata

```ts
{
    kind: "injectable",
    scope: "singleton" | "transient"
}
```

---

## `@Module()`

Declares a module boundary.

```ts
import { Module } from "@electrojs/common";

@Module({
    id: "auth",
    imports: [],
    providers: [],
    views: [],
    windows: [],
    exports: [],
})
class AuthModule {}
```

### Options

- `id?: string`
- `imports?: readonly ModuleImport[]`
- `providers?: readonly ModuleProvider[]`
- `views?: readonly ModuleView[]`
- `windows?: readonly ModuleWindow[]`
- `exports?: readonly ModuleExport[]`

### Rules

- `imports` must contain decorated module classes or `Ref.create(() => ModuleClass)`
- `providers` must contain decorated injectable classes or `Ref.create(() => InjectableClass)`
- `views` must contain decorated view classes or `Ref.create(() => ViewClass)`
- `windows` must contain decorated window classes or `Ref.create(() => WindowClass)`
- `exports` must contain decorated declared classes or `Ref.create(() => declared class)`

### Stored metadata

```ts
{
    kind: "module",
    id?: string,
    imports: readonly ModuleImport[],
    providers: readonly ModuleProvider[],
    views: readonly ModuleView[],
    windows: readonly ModuleWindow[],
    exports: readonly ModuleExport[]
}
```

---

## `@View()`

Declares a runtime view descriptor.

```ts
import { View } from "@electrojs/common";

@View({
    source: "view:main",
    access: ["auth:getMe"],
    signals: ["auth:user-logged-in"],
})
class MainView {}
```

### Source rules

Bundled view:

```ts
@View({
    source: "view:main",
})
class MainView {}
```

- `id` is derived automatically from `source`
- explicit `id` is forbidden

External view:

```ts
@View({
    id: "devtools",
    source: "http://localhost:5173",
})
class DevtoolsView {}
```

- explicit `id` is required for `file:`, `http://`, and `https://`

### Options

- `source: \`view:${string}\` | \`file:${string}\` | \`http://${string}\` | \`https://${string}\``
- `id` depending on source kind
- `access?: readonly string[]`
- `signals?: readonly string[]`
- `configuration?: { webContents?: WebContents; webPreferences?: WebPreferences }`

### Validation behavior

- trims and deduplicates `access`
- trims and deduplicates `signals`
- rejects invalid source schemes
- requires `configuration` to be a plain object when provided
- requires `configuration.webPreferences` to be a plain object when provided

### Stored metadata

```ts
{
    kind: "view",
    id: string,
    source: string,
    access: readonly string[],
    signals: readonly string[],
    configuration?: {
        webContents?: WebContents,
        webPreferences?: WebPreferences
    }
}
```

---

## `@Window()`

Declares a runtime window descriptor.

```ts
import { Window } from "@electrojs/common";

@Window({ id: "main" })
class MainWindow {}
```

### Options

- `id?: string`
- `configuration?: BaseWindowConstructorOptions`

If `id` is omitted, it defaults to the class name.

### Stored metadata

```ts
{
    kind: "window",
    id: string,
    configuration?: BaseWindowConstructorOptions
}
```

---

## Method decorators

These decorators attach metadata to instance method handler functions.

## `@command()`

Marks a method as a runtime command.

```ts
import { command } from "@electrojs/common";

class AuthService {
    @command()
    public logout(): void {}

    @command({ id: "auth:login" })
    public login(): void {}
}
```

### Behavior

- default `id` is the method name
- explicit `id` is supported
- static methods are rejected
- getters are rejected
- symbol-named methods are rejected

### Stored metadata

```ts
{
    kind: "command",
    methodName: string,
    id: string
}
```

---

## `@query()`

Marks a method as a runtime query.

```ts
import { query } from "@electrojs/common";

class AuthService {
    @query()
    public getMe(): void {}

    @query({ id: "auth:getMe" })
    public getProfile(): void {}
}
```

### Behavior

- default `id` is the method name
- explicit `id` is supported
- shares the same strict target validation as `@command()`

### Stored metadata

```ts
{
    kind: "query",
    methodName: string,
    id: string
}
```

---

## `@job()`

Marks a method as a runtime job.

```ts
import { job } from "@electrojs/common";

class SyncService {
    @job({ id: "sync:users", cron: "0 * * * *" })
    public syncUsers(): void {}

    @job()
    public cleanup(): void {}
}
```

### Options

- `id?: string`
- `cron?: string`

### Behavior

- default `id` is the method name
- explicit `id` is supported
- `cron` is optional
- provided string values must be non-empty

### Stored metadata

```ts
{
    kind: "job",
    methodName: string,
    id: string,
    cron?: string
}
```

---

## `@signal()`

Marks a method as a runtime signal handler.

```ts
import { signal } from "@electrojs/common";

class AuthService {
    @signal({ id: "auth:user-logged-in" })
    public onLogin(): void {}

    @signal()
    public onLogout(): void {}
}
```

### Options

- `id?: string`

### Behavior

- default `id` is the method name
- explicit `id` is supported
- provided `id` must be a non-empty string

### Stored metadata

```ts
{
    kind: "signal",
    methodName: string,
    id: string
}
```

---

## `apply()`

Composes multiple decorators into one.

```ts
import { apply, Injectable, SetMetadata } from "@electrojs/common";

const FEATURE_KEY = Symbol("feature");

@apply(Injectable(), SetMetadata(FEATURE_KEY, true))
class AuthService {}
```

Supported compositions:

- class decorators
- method decorators
- property decorators
- parameter decorators

The decorator list is validated up front.

---

## `SetMetadata()`

Attaches arbitrary metadata to a class, method, or property target.

```ts
import { SetMetadata } from "@electrojs/common";

const FEATURE_KEY = Symbol("feature");

@SetMetadata(FEATURE_KEY, "auth")
class AuthModule {}
```

### Behavior

- class metadata is defined on the class target
- method metadata is defined on the method handler function
- property metadata is defined on the property target
- parameter decorators are intentionally not supported

---

## Dependency injection primitives

## `Ref.create()`

Creates a lazily resolved reference for declaration-time cycles.

```ts
import { Ref } from "@electrojs/common";

const AuthModuleRef = Ref.create(() => AuthModule);
```

### Use cases

- modules that reference other modules declared later
- provider definitions that need late-bound classes or tokens

### Important note

`Ref.create()` solves declaration-time reference ordering. It does **not** solve runtime circular instantiation problems by itself.

### Related helpers

```ts
Ref.isRef(value);
Ref.resolve(value);
```

---

## Injection tokens

Use typed token objects for non-class dependencies.

```ts
import { createInjectionToken } from "@electrojs/common";

export const API_URL = createInjectionToken<string>("API_URL");
```

### Example

```ts
import { createInjectionToken, describeInjectionToken } from "@electrojs/common";

const AUTH_TOKEN = createInjectionToken<string>("AUTH_TOKEN");

describeInjectionToken(AUTH_TOKEN); // "AUTH_TOKEN"
```

### Exports

- `createInjectionToken()`
- `isInjectionTokenSymbol()`
- `describeInjectionToken()`

---

## Provider helpers

The package exports runtime guards for provider declarations.

```ts
import { isConstructor, isProviderClass, isClassProvider, isProvider, isModule } from "@electrojs/common";
```

### Example

```ts
const provider = {
    provide: API_URL,
    useClass: ApiClient,
};

if (isClassProvider(provider)) {
    console.log(provider.useClass);
}
```

These guards are useful in runtime internals, tooling, and validation layers.

---

## Metadata accessors

The package provides read helpers for ElectroJS metadata.

```ts
import {
    getModuleMetadata,
    getInjectableMetadata,
    getWindowMetadata,
    getViewMetadata,
    getCommandMetadata,
    getQueryMetadata,
    getJobMetadata,
    getSignalMetadata,
    getMethodMetadata,
    getMethodsMetadataByClass,
} from "@electrojs/common";
```

### Example

```ts
const moduleMetadata = getModuleMetadata(AuthModule);
const methods = getMethodsMetadataByClass(AuthService);
```

---

## Low-level metadata helpers

```ts
import { defineMetadata, getMetadata, getOwnMetadata, hasOwnMetadata } from "@electrojs/common";
```

These are thin typed wrappers around the Reflect Metadata API.

---

## Validation philosophy

`@electrojs/common` validates eagerly and throws framework-specific exceptions with stable error codes.

That means invalid framework usage usually fails:

- immediately
- with a specific exception type
- with a machine-readable `code`
- with structured `context`

Example:

```ts
import { Injectable } from "@electrojs/common";

Injectable({ scope: "request" as never });
```

This throws a `DecoratorConfigurationError` with code:

```ts
"ELECTRO_DECORATOR_INVALID_SCOPE";
```

---

## Errors

All framework-specific errors inherit from `ElectroError`.

```ts
import { ElectroError } from "@electrojs/common";
```

Every error includes:

- `message`
- `code`
- optional `context`

### Main error families

- `DecoratorError`
- `DecoratorTargetError`
- `DecoratorConfigurationError`
- `MetadataError`
- `MetadataConflictError`
- `ModuleError`
- `ModuleConfigurationError`
- `ProviderError`
- `ProviderConfigurationError`
- `TokenError`
- `TokenConfigurationError`

### Example

```ts
import { ElectroError, createInjectionToken } from "@electrojs/common";

try {
    createInjectionToken("   ");
} catch (error) {
    if (error instanceof ElectroError) {
        console.error(error.code, error.context);
    }
}
```

---

## Public types

The package exports the framework's shared public types, including:

- constructor and token types
- decorator option types
- provider and module types
- metadata shapes
- view and window types

Example:

```ts
import type { InjectionToken, Provider, ModuleOptions, ViewOptions, WindowOptions, MethodMetadata } from "@electrojs/common";
```

---

## What this package does not do

`@electrojs/common` does not:

- instantiate providers
- run lifecycle hooks
- resolve injection contexts
- implement bridge transport
- manage windows or web contents
- generate renderer typings

Those responsibilities belong to higher-level packages such as the runtime and renderer layers.

---

## Typical package layering

A simplified view of the intended dependency direction:

```txt
@electrojs/common
    ↑
@electrojs/runtime
    ↑
@electrojs/renderer
```

`@electrojs/common` should remain the shared, stable base layer.
