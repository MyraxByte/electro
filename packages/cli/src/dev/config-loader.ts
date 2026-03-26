import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { ResolverFactory } from "oxc-resolver";
import { loadConfigFromFile } from "vite";
import { validateConfig } from "../validate";
import {
    assertLoadedViewDefinition,
    extractUserConfig,
    normalizeLoadedViewDefinition,
    type CliViewDefinition,
    type ElectroCodegenDefinition,
    type ElectroConfigLike,
    type RuntimeConfigLike,
} from "./views";

const DISCOVERY_IGNORED_DIRS = new Set([".git", ".hg", ".svn", ".electro", "coverage", "dist", "node_modules", "out"]);
const CONFIG_RESOLVE_EXTENSIONS = [".ts", ".mts", ".cts", ".js", ".mjs", ".cjs", ".json"];

interface LoadedConfigModule<TValue> {
    readonly dependencies: readonly string[];
    readonly value: TValue;
}

interface AppConfigShape {
    readonly runtime?: unknown;
    readonly views?: unknown;
    readonly codegen?: ElectroCodegenDefinition;
}

interface RuntimeConfigShape extends Record<string, unknown> {
    readonly entry?: string;
}

interface WorkspacePackageIndex {
    readonly packages: ReadonlyMap<string, string>;
    readonly root: string | null;
}

export interface LoadedConfig {
    config: ElectroConfigLike;
    views: readonly CliViewDefinition[];
    scanDir: string;
    watchFiles: readonly string[];
    /** Absolute path to the config file */
    configPath: string;
    /** Project root (directory containing config) */
    root: string;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeWatchFiles(filePath: string, dependencies?: readonly string[]): readonly string[] {
    return [...new Set([filePath, ...(dependencies ?? [])])];
}

async function loadConfigModule<TValue>(filePath: string, label: string): Promise<LoadedConfigModule<TValue>> {
    const loaded = await loadConfigFromFile({ command: "build", mode: "production" }, filePath);
    const value = loaded?.config as TValue | undefined;

    if (!value) {
        throw new Error(`${label} "${filePath}" must have a default export`);
    }

    return {
        value,
        dependencies: normalizeWatchFiles(filePath, loaded?.dependencies),
    };
}

async function findFilesByName(root: string, fileName: string): Promise<readonly string[]> {
    const matches: string[] = [];

    async function walk(currentDir: string): Promise<void> {
        const entries = await readdir(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.isDirectory()) {
                if (DISCOVERY_IGNORED_DIRS.has(entry.name)) {
                    continue;
                }

                await walk(join(currentDir, entry.name));
                continue;
            }

            if (entry.isFile() && entry.name === fileName) {
                matches.push(join(currentDir, entry.name));
            }
        }
    }

    await walk(root);
    matches.sort();
    return matches;
}

async function findWorkspaceRoot(startDir: string): Promise<string | null> {
    let currentDir = startDir;

    while (true) {
        // pnpm-workspace.yaml is the canonical workspace marker for pnpm projects.
        if (existsSync(join(currentDir, "pnpm-workspace.yaml"))) {
            return currentDir;
        }

        const packageJsonPath = join(currentDir, "package.json");
        if (existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(await readFile(packageJsonPath, "utf-8")) as { workspaces?: unknown };
                if (Array.isArray(packageJson.workspaces) || (isObjectRecord(packageJson.workspaces) && Array.isArray(packageJson.workspaces.packages))) {
                    return currentDir;
                }
            } catch {
                // Ignore invalid package.json while walking upward.
            }
        }

        const parentDir = dirname(currentDir);
        if (parentDir === currentDir) {
            return null;
        }

        currentDir = parentDir;
    }
}

async function indexWorkspacePackages(root: string): Promise<WorkspacePackageIndex> {
    const workspaceRoot = await findWorkspaceRoot(root);
    if (!workspaceRoot) {
        return {
            root: null,
            packages: new Map(),
        };
    }

    const packages = new Map<string, string>();
    const packageJsonFiles = await findFilesByName(workspaceRoot, "package.json");

    for (const packageJsonPath of packageJsonFiles) {
        try {
            const packageJson = JSON.parse(await readFile(packageJsonPath, "utf-8")) as { name?: string };
            if (typeof packageJson.name !== "string" || packageJson.name.trim().length === 0) {
                continue;
            }

            const packageDir = dirname(packageJsonPath);
            const existingDir = packages.get(packageJson.name);
            if (existingDir && existingDir !== packageDir) {
                throw new Error(`Found duplicate workspace package name "${packageJson.name}" in:\n${existingDir}\n${packageDir}`);
            }

            packages.set(packageJson.name, packageDir);
        } catch (error) {
            if (error instanceof Error && error.message.startsWith('Found duplicate workspace package name "')) {
                throw error;
            }

            // Ignore invalid nested package.json files.
        }
    }

    return {
        root: workspaceRoot,
        packages,
    };
}

function createConfigResolver(workspacePackages: ReadonlyMap<string, string>): ResolverFactory {
    const alias =
        workspacePackages.size > 0
            ? Object.fromEntries([...workspacePackages.entries()].map(([packageName, packageDir]) => [packageName, [packageDir] as string[]]))
            : undefined;

    return new ResolverFactory({
        alias,
        conditionNames: ["node", "import"],
        extensions: CONFIG_RESOLVE_EXTENSIONS,
        mainFields: ["module", "main"],
        tsconfig: "auto",
    });
}

function isPathLikeSpecifier(specifier: string): boolean {
    return specifier.startsWith(".") || specifier.startsWith("/") || /^[A-Za-z]:[\\/]/.test(specifier);
}

function normalizeConfigRequest(specifier: string, fileName: string): string {
    const trimmed = specifier.trim().replace(/[/\\]+$/, "");

    if (trimmed.endsWith(`/${fileName}`) || trimmed.endsWith(`\\${fileName}`) || trimmed === fileName) {
        return trimmed;
    }

    return `${trimmed}/${fileName}`;
}

function resolveConfigPathWithResolver(configPath: string, resolver: ResolverFactory, specifier: string, fileName: string): string | null {
    try {
        const result = resolver.resolveFileSync(configPath, normalizeConfigRequest(specifier, fileName));
        if (typeof result.path === "string" && existsSync(result.path)) {
            return result.path;
        }
    } catch {
        // Fall through to the workspace/path fallback below.
    }

    return null;
}

function resolveConfigPathWithWorkspaceFallback(workspacePackages: ReadonlyMap<string, string>, specifier: string, fileName: string): string | null {
    const packageDir = workspacePackages.get(specifier);
    if (!packageDir) {
        return null;
    }

    const configPath = resolve(packageDir, fileName);
    return existsSync(configPath) ? configPath : null;
}

function resolveConfigPathWithPathFallback(root: string, specifier: string, fileName: string): string | null {
    if (!isPathLikeSpecifier(specifier)) {
        return null;
    }

    const configPath = resolve(root, normalizeConfigRequest(specifier, fileName));
    return existsSync(configPath) ? configPath : null;
}

function resolveExplicitConfigPath(
    root: string,
    configPath: string,
    resolver: ResolverFactory,
    workspaceIndex: WorkspacePackageIndex,
    specifier: string,
    fileName: string,
): string {
    const resolvedByResolver = resolveConfigPathWithResolver(configPath, resolver, specifier, fileName);
    if (resolvedByResolver) {
        return resolvedByResolver;
    }

    const resolvedByWorkspaceFallback = resolveConfigPathWithWorkspaceFallback(workspaceIndex.packages, specifier, fileName);
    if (resolvedByWorkspaceFallback) {
        return resolvedByWorkspaceFallback;
    }

    const resolvedByPathFallback = resolveConfigPathWithPathFallback(root, specifier, fileName);
    if (resolvedByPathFallback) {
        return resolvedByPathFallback;
    }

    if (workspaceIndex.root && !isPathLikeSpecifier(specifier)) {
        if (workspaceIndex.packages.has(specifier)) {
            throw new Error(`Workspace package "${specifier}" does not contain "${fileName}".`);
        }

        throw new Error(`Workspace package "${specifier}" could not be resolved from "${workspaceIndex.root}".`);
    }

    throw new Error(`Could not resolve "${specifier}" to "${fileName}" from "${configPath}".`);
}

function normalizeRuntimeConfig(value: RuntimeConfigShape, sourcePath: string): RuntimeConfigLike {
    if (typeof value.entry !== "string" || value.entry.trim().length === 0) {
        throw new Error(`Runtime config "${sourcePath}" must define a non-empty string entry.`);
    }

    return {
        entry: value.entry,
        __source: sourcePath,
        userConfig: extractUserConfig(value, ["entry", "__source", "vite"]),
    };
}

function isInlineLegacyRuntime(value: unknown): value is RuntimeConfigShape {
    return isObjectRecord(value) && typeof value.entry === "string";
}

function resolveScanDir(root: string, codegen: ElectroCodegenDefinition | undefined, runtimeSource: string): string {
    if (codegen?.scanDir && codegen.scanDir.trim().length > 0) {
        return resolve(root, codegen.scanDir);
    }

    return dirname(runtimeSource);
}

function normalizeViewSpecifiers(value: unknown): readonly string[] {
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim().length === 0)) {
        throw new Error(`electro.config.ts "views" must be an array of non-empty package specifiers.`);
    }

    return value;
}

async function loadViewDefinitions(
    root: string,
    configPath: string,
    appConfig: AppConfigShape,
    resolver: ResolverFactory,
    workspaceIndex: WorkspacePackageIndex,
): Promise<{
    readonly views: readonly CliViewDefinition[];
    readonly watchFiles: readonly string[];
}> {
    const viewSpecifiers = normalizeViewSpecifiers(appConfig.views);
    const viewConfigPaths = viewSpecifiers.map((specifier) =>
        resolveExplicitConfigPath(root, configPath, resolver, workspaceIndex, specifier, "view.config.ts"),
    );

    const views: CliViewDefinition[] = [];
    const watchFiles = new Set<string>();

    for (const viewConfigPath of viewConfigPaths) {
        const loaded = await loadConfigModule<unknown>(viewConfigPath, "View config");
        assertLoadedViewDefinition(loaded.value, viewConfigPath);

        views.push(normalizeLoadedViewDefinition(loaded.value, viewConfigPath));
        for (const filePath of loaded.dependencies) {
            watchFiles.add(filePath);
        }
    }

    return {
        views,
        watchFiles: [...watchFiles].sort(),
    };
}

export async function loadConfig(configPath: string): Promise<LoadedConfig> {
    const absolutePath = resolve(process.cwd(), configPath);
    const root = dirname(absolutePath);

    if (!existsSync(absolutePath)) {
        throw new Error(`Config file not found: ${absolutePath}`);
    }

    const loadedAppConfig = await loadConfigModule<AppConfigShape>(absolutePath, "ElectroJS config");
    if (!isObjectRecord(loadedAppConfig.value)) {
        throw new Error(`${configPath} must export an object from defineElectroConfig(...)`);
    }
    const appConfig = loadedAppConfig.value as AppConfigShape;
    const workspaceIndex = await indexWorkspacePackages(root);
    const resolver = createConfigResolver(workspaceIndex.packages);

    let runtime: RuntimeConfigLike;
    const watchFiles = new Set<string>(loadedAppConfig.dependencies);

    if (isInlineLegacyRuntime(appConfig.runtime)) {
        runtime = normalizeRuntimeConfig(appConfig.runtime, absolutePath);
    } else {
        if (typeof appConfig.runtime !== "string" || appConfig.runtime.trim().length === 0) {
            throw new Error(`electro.config.ts "runtime" must be a non-empty package specifier.`);
        }

        const runtimeConfigPath = resolveExplicitConfigPath(root, absolutePath, resolver, workspaceIndex, appConfig.runtime, "runtime.config.ts");

        const loadedRuntimeConfig = await loadConfigModule<RuntimeConfigShape>(runtimeConfigPath, "Runtime config");
        runtime = normalizeRuntimeConfig(loadedRuntimeConfig.value, runtimeConfigPath);

        for (const filePath of loadedRuntimeConfig.dependencies) {
            watchFiles.add(filePath);
        }
    }

    const loadedViews = await loadViewDefinitions(root, absolutePath, appConfig, resolver, workspaceIndex);
    for (const filePath of loadedViews.watchFiles) {
        watchFiles.add(filePath);
    }

    const config: ElectroConfigLike = {
        codegen: appConfig.codegen,
        runtime,
    };

    validateConfig(config);

    return {
        config,
        views: loadedViews.views,
        scanDir: resolveScanDir(root, config.codegen, runtime.__source),
        watchFiles: [...watchFiles].sort(),
        configPath: absolutePath,
        root,
    };
}
