/**
 * Public type contracts for `@electro/codegen`.
 *
 * All scan result types, generator input/output types, and diagnostic types
 * are defined here and re-exported from the package entry point.
 *
 * @module types
 */

// ── Scan Result ─────────────────────────────────────────────────────

/** Complete result of scanning a project's source files for Electro decorators. */
export interface ScanResult {
    readonly modules: readonly ScannedModule[];
    readonly windows: readonly ScannedWindow[];
    readonly views: readonly ScannedView[];
}

/** A class decorated with `@Module()`. */
export interface ScannedModule {
    /** Derived or explicit module ID (from `@Module({ id })` or class name). */
    readonly id: string;
    readonly className: string;
    readonly filePath: string;
    readonly exported: boolean;
    /** Module class names referenced in `@Module({ imports })`. */
    readonly imports: readonly string[];
    /** `@Injectable()` providers registered in this module via `@Module({ providers })`. */
    readonly providers: readonly ScannedProvider[];
    /** `@command` / `@query` methods declared directly on the module class. */
    readonly methods: readonly ScannedMethod[];
    /** `@signal` handler methods declared directly on the module class. */
    readonly signals: readonly ScannedSignal[];
    /** `@job` methods declared directly on the module class. */
    readonly jobs: readonly ScannedJob[];
}

/** A class decorated with `@Injectable()` that belongs to a module. */
export interface ScannedProvider {
    readonly className: string;
    readonly filePath: string;
    readonly exported: boolean;
    /** `@command` / `@query` methods declared on this provider. */
    readonly methods: readonly ScannedMethod[];
    /** `@signal` handler methods declared on this provider. */
    readonly signals: readonly ScannedSignal[];
    /** `@job` methods declared on this provider. */
    readonly jobs: readonly ScannedJob[];
}

/** A method decorated with `@command()` or `@query()`. */
export interface ScannedMethod {
    /** Method ID: from `@command({ id })` / `@query({ id })`, or the method name. */
    readonly id: string;
    readonly methodName: string;
    readonly kind: "command" | "query";
    /** Class name that owns this method. */
    readonly ownerClassName: string;
}

export type ScannedSignalSource = "decorator" | "publish" | "subscribe";

export type ScannedSignalPayload =
    | {
          readonly kind: "method-parameter";
          readonly parameterIndex: number;
      }
    | {
          readonly kind: "method-parameter-pick";
          readonly parameterIndex: number;
          readonly keys: readonly string[];
      }
    | {
          readonly kind: "void";
      }
    | {
          readonly kind: "unknown";
      };

/** A signal observed from `@signal()`, `publish()`, or `subscribe()`. */
export interface ScannedSignal {
    /** Signal ID observed in the runtime class. */
    readonly id: string;
    /** Method that declared, published, or subscribed to this signal. */
    readonly methodName: string;
    /** Class name that owns this signal declaration/publication/subscription. */
    readonly ownerClassName: string;
    /** How this signal was discovered. */
    readonly source: ScannedSignalSource;
    /** Best-effort payload source for bridge/env type generation. */
    readonly payload: ScannedSignalPayload;
}

/** A method decorated with `@job()`. */
export interface ScannedJob {
    /** Job ID: from `@job({ id })`, or the method name. */
    readonly id: string;
    readonly methodName: string;
    /** Class name that owns this job. */
    readonly ownerClassName: string;
    /** Cron expression from `@job({ cron })`, or `null`. */
    readonly cron: string | null;
}

/** A class decorated with `@Window()`. */
export interface ScannedWindow {
    readonly id: string;
    readonly className: string;
    readonly filePath: string;
    readonly exported: boolean;
}

/** A class decorated with `@View()`. */
export interface ScannedView {
    readonly id: string;
    readonly className: string;
    readonly filePath: string;
    readonly exported: boolean;
    /** Source URL from `@View({ source })`. */
    readonly source: string;
    /** Bridge access keys from `@View({ access })`. */
    readonly access: readonly string[];
    /** Signal keys from `@View({ signals })`. */
    readonly signals: readonly string[];
}

// ── Generator Input/Output ──────────────────────────────────────────

/** Target for per-package `electro-env.d.ts` generation. */
export interface PackageTypeTarget {
    /** Absolute path to the renderer package root (dirname of `view.config.ts`). */
    readonly packageRoot: string;
    /** View ID that this renderer package belongs to. */
    readonly viewId: string;
}

/** Input for the `generate()` function. */
export interface GeneratorInput {
    readonly scanResult: ScanResult;
    /** CLI-discovered view configs (for preload extension paths). */
    readonly views?: readonly GeneratorViewDefinition[];
    /** Directory where `generated/` folder will be placed. */
    readonly outputDir: string;
    /** Project source root for relative import resolution. */
    readonly srcDir: string;
    /** Targets for per-package `electro-env.d.ts` generation. */
    readonly packageTargets?: readonly PackageTypeTarget[];
}

/** A view definition provided by the CLI (not from AST scanning). */
export interface GeneratorViewDefinition {
    readonly id: string;
    /** Path to the user's preload extension script, or `null`/`undefined`. */
    readonly preload?: string | null;
    /** Original file path for relative import resolution. */
    readonly __source: string;
}

/** A generated package-local `electro-env.d.ts` file. */
export interface PackageTypeOutput {
    /** Absolute path to the package root. */
    readonly packageRoot: string;
    /** Relative output path inside the package root. */
    readonly path: string;
    /** Content of the generated declaration file. */
    readonly content: string;
    /** Backward-compatible alias for the generated declaration content. */
    readonly indexDts?: string;
    /** Deprecated leftover from the old `@electro/types` package layout. */
    readonly packageJson?: string;
}

/** Output from the `generate()` function. */
export interface GeneratorOutput {
    /** Generated files: preload scripts and runtime registry. */
    readonly files: readonly GeneratedFile[];
    /** The runtime package `electro-env.d.ts` ambient type declaration file. */
    readonly envTypes: GeneratedFile;
    /** Per-view renderer package `electro-env.d.ts` outputs. */
    readonly packageTypes: readonly PackageTypeOutput[];
}

/** A generated file with its output path and content. */
export interface GeneratedFile {
    readonly path: string;
    readonly content: string;
}

// ── Diagnostics ─────────────────────────────────────────────────────

/** A diagnostic message produced during validation. */
export interface CodegenDiagnostic {
    readonly code: string;
    readonly message: string;
    readonly filePath?: string;
}
