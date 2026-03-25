import type { Constructor, InjectionToken, Provider } from "@electrojs/common";
import {
    describeInjectionToken,
    getInjectableMetadata,
    getModuleMetadata,
    getViewMetadata,
    getWindowMetadata,
    isClassProvider,
    isInjectionTokenSymbol,
} from "@electrojs/common";
import { DIError } from "../errors/di";
import { InjectionContext } from "./injection-context";
import type { ClassProviderRecord, ProviderInstanceCell, ProviderKey, ProviderRecord, ValueProviderRecord } from "./provider-record";

function tokenKey(token: InjectionToken): ProviderKey {
    return isInjectionTokenSymbol(token) ? token.key : token;
}

function isManagedClass(target: Constructor): boolean {
    return (
        getInjectableMetadata(target) !== undefined ||
        getModuleMetadata(target) !== undefined ||
        getViewMetadata(target) !== undefined ||
        getWindowMetadata(target) !== undefined
    );
}

function normalizeProvider(provider: Provider): ClassProviderRecord {
    if (isClassProvider(provider)) {
        const meta = getInjectableMetadata(provider.useClass as Constructor);
        return {
            kind: "class",
            provide: provider.provide,
            useClass: provider.useClass as Constructor,
            scope: meta?.scope ?? "singleton",
        };
    }

    const target = provider as Constructor;
    const meta = getInjectableMetadata(target);

    return {
        kind: "class",
        provide: target,
        useClass: target,
        scope: meta?.scope ?? "singleton",
    };
}

/**
 * Hierarchical dependency injection container.
 *
 * Each module in the runtime graph owns an `Injector` instance. Injectors form a parent-child
 * tree: when a token is not found locally, resolution walks up to the parent injector.
 *
 * Providers are registered via {@link Injector.provide} (class-based) or
 * {@link Injector.provideValue} (pre-existing value). Resolution is triggered by
 * {@link Injector.get} or indirectly by calling {@link inject} inside a framework-managed context.
 *
 * @remarks
 * - Singleton providers are instantiated once per injector and cached.
 * - Transient providers create a new instance on every resolution.
 * - Circular dependencies are detected at resolution time and throw {@link DIError}.
 *
 * @example
 * ```ts
 * const root = new Injector();
 * root.provide(MyService);
 *
 * const child = root.createChild();
 * child.get(MyService); // resolves from root
 * ```
 */
export class Injector {
    private readonly providers = new Map<ProviderKey, ProviderRecord>();
    private readonly instances = new Map<ProviderKey, ProviderInstanceCell>();
    private readonly resolutionPath: string[] = [];

    public constructor(private readonly parent?: Injector) {}

    /** Create a child injector that delegates unresolved tokens to this injector. */
    public createChild(): Injector {
        return new Injector(this);
    }

    /**
     * Register a class-based provider.
     *
     * Accepts either a bare `@Injectable()` class or a `{ provide, useClass }` object.
     *
     * @throws {@link DIError} if a provider with the same token is already registered in this injector.
     */
    public provide(provider: Provider): void {
        const record = normalizeProvider(provider);
        const key = tokenKey(record.provide);
        const description = describeInjectionToken(record.provide);

        if (this.providers.has(key)) {
            throw DIError.duplicateProvider(description);
        }

        this.providers.set(key, record);
    }

    /**
     * Register a pre-existing value as a provider.
     *
     * Use this for configuration objects, constants, or instances created outside the DI system.
     *
     * @throws {@link DIError} if a provider with the same token is already registered in this injector.
     */
    public provideValue<T>(token: InjectionToken<T>, value: T): void {
        const key = tokenKey(token);
        const description = describeInjectionToken(token);

        if (this.providers.has(key)) {
            throw DIError.duplicateProvider(description);
        }

        const record: ValueProviderRecord<T> = {
            kind: "value",
            provide: token,
            useValue: value,
        };

        this.providers.set(key, record);
    }

    /** Check whether a provider is registered for the given token in this injector or any ancestor. */
    public has(token: InjectionToken): boolean {
        const key = tokenKey(token);
        return this.providers.has(key) || this.parent?.has(token) === true;
    }

    /**
     * Resolve a provider by token, instantiating it if necessary.
     *
     * Resolution walks up the injector hierarchy until a matching provider is found.
     *
     * @throws {@link DIError} if no provider is found, a circular dependency is detected,
     *         or the target class is not framework-managed.
     */
    public get<T>(token: InjectionToken<T>): T {
        const description = describeInjectionToken(token);
        return this.resolve(token, description);
    }

    private resolve<T>(token: InjectionToken<T>, description: string): T {
        const key = tokenKey(token);
        const record = this.providers.get(key);

        if (record) {
            return this.resolveRecord(record, key, description);
        }

        if (this.parent) {
            return this.parent.resolve(token, description);
        }

        throw DIError.providerNotFound(description);
    }

    private resolveRecord<T>(record: ProviderRecord, key: ProviderKey, description: string): T {
        if (record.kind === "value") {
            return record.useValue as T;
        }

        return this.resolveWithPath(description, () => {
            return record.scope === "transient" ? this.instantiate<T>(record.useClass, description) : this.resolveSingleton<T>(record, key, description);
        });
    }

    private resolveSingleton<T>(record: ClassProviderRecord, key: ProviderKey, description: string): T {
        const existing = this.instances.get(key);

        if (existing?.status === "resolved") {
            return existing.value as T;
        }

        if (existing?.status === "resolving") {
            throw DIError.circularDependency([...this.resolutionPath, description]);
        }

        this.instances.set(key, { status: "resolving" });

        try {
            const instance = this.instantiate<T>(record.useClass, description);
            this.instances.set(key, { status: "resolved", value: instance as object });
            return instance;
        } catch (error) {
            this.instances.delete(key);
            throw error;
        }
    }

    private instantiate<T>(target: Constructor, description: string): T {
        if (!isManagedClass(target)) {
            throw DIError.invalidClassProvider(description);
        }

        return InjectionContext.run(this, () => new target() as T);
    }

    private resolveWithPath<T>(description: string, resolver: () => T): T {
        if (this.resolutionPath.includes(description)) {
            throw DIError.circularDependency([...this.resolutionPath, description]);
        }

        this.resolutionPath.push(description);

        try {
            return resolver();
        } finally {
            this.resolutionPath.pop();
        }
    }
}
