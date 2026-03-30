import type { InjectionToken } from "@electrojs/common";
import type { TypedSignalBus } from "../contracts/authoring";
import { DIError } from "../errors/di";
import { SignalBus } from "../signals/bus";
import { InjectionContext } from "./injection-context";

/**
 * Resolve a dependency from the current injection context.
 *
 * This is the primary way framework-managed classes obtain their dependencies.
 * It reads the active {@link Injector} from `AsyncLocalStorage` and delegates to
 * {@link Injector.get}.
 *
 * @remarks
 * `inject()` is only available inside a framework-managed execution scope:
 * - **Construction** -- property initializers of `@Injectable()`, `@Module()`, `@View()`, or `@Window()` classes
 * - **Lifecycle hooks** -- `onInit`, `onStart`, `onReady`, `onShutdown`, `onDispose`
 * - **Capability handlers** -- methods decorated with `@command`, `@query`, `@signal`, or `@job`
 *
 * Calling it anywhere else (e.g. in a `setTimeout` callback or a plain function)
 * throws {@link DIError} with code `ELECTRO_DI_NO_INJECTION_CONTEXT`.
 *
 * @example
 * ```ts
 * @Injectable()
 * class MyService {
 *   private readonly config = inject(AppConfig);
 * }
 * ```
 *
 * @throws {@link DIError} if no injection context is active or the token cannot be resolved.
 */
export function inject<T>(token: InjectionToken<T>): T extends SignalBus ? TypedSignalBus : T {
    const injector = InjectionContext.current();

    if (!injector) {
        throw DIError.noInjectionContext();
    }

    return injector.get(token) as T extends SignalBus ? TypedSignalBus : T;
}
