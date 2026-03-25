import { dirname, resolve } from "node:path";
import type { UserConfig } from "vite";

export interface ElectroCodegenDefinition {
    readonly scanDir?: string;
}

export interface RuntimeConfigLike {
    readonly entry: string;
    readonly __source: string;
    readonly userConfig?: UserConfig;
}

export interface ElectroConfigLike {
    readonly codegen?: ElectroCodegenDefinition;
    readonly runtime: RuntimeConfigLike;
}

export interface CliViewDefinition {
    readonly id: string;
    readonly __source: string;
    readonly entry?: string;
    readonly preload?: string;
    readonly userConfig?: UserConfig;
}

export interface RendererViewDefinition extends CliViewDefinition {
    readonly root: string;
    readonly entry: string;
}

type LooseUserConfig = Record<string, unknown>;

export interface LoadedViewConfigShape extends LooseUserConfig {
    readonly id?: string;
    readonly viewId?: string;
    readonly __source?: string;
    readonly entry?: string;
    readonly preload?: string;
    readonly vite?: UserConfig;
}

export function assertLoadedViewDefinition(value: unknown, filePath: string): asserts value is LoadedViewConfigShape {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error(`View config "${filePath}" must export a defineViewConfig(...) object as default.`);
    }

    const { id, viewId, preload, __source, entry } = value as Record<string, unknown>;
    const resolvedId = typeof viewId === "string" ? viewId : id;

    if (typeof resolvedId !== "string" || resolvedId.trim().length === 0) {
        throw new Error(`View config "${filePath}" must define a non-empty string viewId.`);
    }

    if (__source !== undefined && typeof __source !== "string") {
        throw new Error(`View config "${filePath}" exported an invalid "__source" value.`);
    }

    if (entry !== undefined && typeof entry !== "string") {
        throw new Error(`View config "${filePath}" exported an invalid "entry" value.`);
    }

    if (preload !== undefined && typeof preload !== "string") {
        throw new Error(`View config "${filePath}" exported an invalid "preload" value.`);
    }
}

export function extractUserConfig(value: LooseUserConfig, customKeys: readonly string[]): UserConfig | undefined {
    const nestedVite = value.vite;
    if (typeof nestedVite === "object" && nestedVite !== null && !Array.isArray(nestedVite)) {
        return nestedVite as UserConfig;
    }

    const userEntries = Object.entries(value).filter(([key]) => !customKeys.includes(key));
    if (userEntries.length === 0) {
        return undefined;
    }

    return Object.fromEntries(userEntries) as UserConfig;
}

export function normalizeLoadedViewDefinition(value: LoadedViewConfigShape, filePath: string): CliViewDefinition {
    const resolvedId = (typeof value.viewId === "string" ? value.viewId : value.id)?.trim();
    if (!resolvedId) {
        throw new Error(`View config "${filePath}" must define a non-empty string viewId.`);
    }

    return {
        id: resolvedId,
        __source: filePath,
        entry: value.entry,
        preload: value.preload,
        userConfig: extractUserConfig(value, ["id", "viewId", "entry", "preload", "__source", "vite"]),
    };
}

export function getViewRoot(view: Pick<CliViewDefinition, "__source">): string {
    return dirname(view.__source);
}

export function getViteViewEntry(view: CliViewDefinition): string {
    return view.entry ?? "./index.html";
}

export function getRendererViews(views: readonly CliViewDefinition[]): readonly RendererViewDefinition[] {
    return views.map((view) => {
        const entry = getViteViewEntry(view);
        const root = getViewRoot(view);
        return {
            ...view,
            root,
            entry,
        };
    });
}

export function resolveRendererViewEntry(view: RendererViewDefinition): string {
    return resolve(view.root, view.entry);
}

export function resolveGeneratedPreloadEntry(outputDir: string, view: Pick<CliViewDefinition, "id">): string {
    return resolve(outputDir, "generated", "preload", `${view.id}.gen.ts`);
}
