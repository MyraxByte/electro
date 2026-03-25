import type { WebContents, WebPreferences } from "electron";

/**
 * Codegen-populated registry of valid `"moduleId:methodId"` view access keys.
 */
export interface ViewAccessRegistry {}

/**
 * Codegen-populated registry of valid signal ids that can be forwarded to views.
 */
export interface ViewSignalRegistry {}

/**
 * Codegen-populated registry of bundled renderer view ids.
 */
export interface BundledViewIdRegistry {}

type RegistryKeys<TRegistry> = Extract<keyof TRegistry, string>;

export type ViewAccessKey = [RegistryKeys<ViewAccessRegistry>] extends [never] ? string : RegistryKeys<ViewAccessRegistry>;

export type ViewSignalKey = [RegistryKeys<ViewSignalRegistry>] extends [never] ? string : RegistryKeys<ViewSignalRegistry>;

export type BundledViewSource = [RegistryKeys<BundledViewIdRegistry>] extends [never] ? `view:${string}` : `view:${RegistryKeys<BundledViewIdRegistry>}`;

/**

* Shared base fields for all view kinds.
 */
interface ViewOptionsBase {
    readonly access?: readonly ViewAccessKey[];
    readonly signals?: readonly ViewSignalKey[];
    readonly configuration?: {
        readonly webContents?: WebContents;
        readonly webPreferences?: WebPreferences;
    };
}

/**

* A bundled renderer view.
*
* The view `id` is derived automatically from the source string:
* `"view:main"` → id `"main"`.
*
* Providing an explicit `id` alongside a `view:*` source is a compile-time error.
 */
export interface BundledViewOptions extends ViewOptionsBase {
    readonly source: BundledViewSource;
    readonly id?: never;
}

/**

* An external view loaded from a local file or a remote URL.
*
* An explicit `id` is required because it cannot be derived from the source.
 */
export interface ExternalViewOptions extends ViewOptionsBase {
    readonly source: `file:${string}` | `http://${string}` | `https://${string}`;
    readonly id: string;
}

/**

* Options accepted by `@View()`.
 */
export type ViewOptions = BundledViewOptions | ExternalViewOptions;

/**

* Stored metadata for `@View()`.
 */
export interface ViewMetadata {
    readonly kind: "view";
    readonly id: string;
    readonly source: string;
    readonly access: readonly string[];
    readonly signals: readonly string[];
    readonly configuration?: {
        readonly webContents?: WebContents;
        readonly webPreferences?: WebPreferences;
    };
}
