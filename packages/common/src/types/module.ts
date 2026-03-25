import type { Constructor } from "./constructors";
import type { Resolvable } from "./di";

export type ModuleClass = Constructor<object>;
export type InjectableClass = Constructor<object>;
export type ViewClass = Constructor<object>;
export type WindowClass = Constructor<object>;
export type ModuleDeclarationClass = InjectableClass | ViewClass | WindowClass;

export type ModuleImport = Resolvable<ModuleClass>;
export type ModuleProvider = Resolvable<InjectableClass>;
export type ModuleView = Resolvable<ViewClass>;
export type ModuleWindow = Resolvable<WindowClass>;
export type ModuleExport = Resolvable<ModuleDeclarationClass>;

/**

* Options accepted by `@Module()`.
 */
export interface ModuleOptions {
    /**
     * Optional stable identifier used by diagnostics and tooling.
     */
    readonly id?: string;

    /**
     * Imported modules visible to this module.
     */
    readonly imports?: readonly ModuleImport[];

    /**
     * Injectable classes declared in this module.
     */
    readonly providers?: readonly ModuleProvider[];

    /**
     * View classes declared in this module.
     */
    readonly views?: readonly ModuleView[];

    /**
     * Window classes declared in this module.
     */
    readonly windows?: readonly ModuleWindow[];

    /**
     * Declared classes exported from this module.
     */
    readonly exports?: readonly ModuleExport[];
}

/**

* Stored metadata for `@Module()`.
 */
export interface ModuleMetadata {
    readonly kind: "module";
    readonly id?: string;
    readonly imports: readonly ModuleImport[];
    readonly providers: readonly ModuleProvider[];
    readonly views: readonly ModuleView[];
    readonly windows: readonly ModuleWindow[];
    readonly exports: readonly ModuleExport[];
}
