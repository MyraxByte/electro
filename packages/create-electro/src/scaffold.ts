import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_TEMPLATE = "monorepo";

const TEMPLATE_ROOT_CANDIDATES = [
    (template: string) => fileURLToPath(new URL(`../../../templates/${template}`, import.meta.url)),
    (template: string) => fileURLToPath(new URL(`../dist/template-${template}`, import.meta.url)),
] as const;

const TEMPLATE_FILE_RENAMES = new Map([["_gitignore", ".gitignore"]]);

const TEXT_FILE_EXTENSIONS = new Set([
    ".css",
    ".html",
    ".json",
    ".md",
    ".svg",
    ".ts",
    ".tsx",
    ".yaml",
    ".yml",
]);

interface ScaffoldProjectOptions {
    readonly force?: boolean;
    readonly projectDir: string;
    readonly template?: string;
}

interface TemplateContext {
    readonly displayName: string;
    readonly packageName: string;
}

function toPackageName(value: string): string {
    const normalized = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    return normalized.length > 0 ? normalized : "electro-app";
}

function toDisplayName(value: string): string {
    return value
        .split(/[^a-zA-Z0-9]+/)
        .filter((part) => part.length > 0)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

async function pathExists(path: string): Promise<boolean> {
    try {
        await stat(path);
        return true;
    } catch {
        return false;
    }
}

async function emptyDirectory(path: string): Promise<void> {
    const entries = await readdir(path);
    await Promise.all(entries.map((entry) => rm(join(path, entry), { recursive: true, force: true })));
}

async function prepareProjectDir(projectDir: string, force: boolean): Promise<void> {
    const exists = await pathExists(projectDir);
    if (!exists) {
        await mkdir(projectDir, { recursive: true });
        return;
    }

    const entries = await readdir(projectDir);
    if (entries.length === 0) {
        return;
    }

    if (!force) {
        throw new Error(`Target directory "${projectDir}" is not empty. Use --force to remove existing files.`);
    }

    await emptyDirectory(projectDir);
}

async function resolveTemplateDir(template: string): Promise<string> {
    const candidates = TEMPLATE_ROOT_CANDIDATES.map((resolveTemplatePath) => resolveTemplatePath(template));

    for (const candidate of candidates) {
        if (await pathExists(candidate)) {
            return candidate;
        }
    }

    throw new Error(`Unknown template "${template}". Checked:\n${candidates.map((candidate) => `- ${candidate}`).join("\n")}`);
}

function renameTemplateEntry(name: string): string {
    return TEMPLATE_FILE_RENAMES.get(name) ?? name;
}

function shouldRenderAsText(path: string): boolean {
    return TEXT_FILE_EXTENSIONS.has(extname(path)) || basename(path) === "_gitignore";
}

function renderTemplate(content: string, context: TemplateContext): string {
    return content.replaceAll("__DISPLAY_NAME__", context.displayName);
}

async function patchProjectPackageJson(projectDir: string, context: TemplateContext): Promise<void> {
    const packageJsonPath = join(projectDir, "package.json");
    if (!(await pathExists(packageJsonPath))) {
        return;
    }

    const source = await readFile(packageJsonPath, "utf8");
    const manifest = JSON.parse(source) as { name?: string };
    manifest.name = context.packageName;

    await writeFile(packageJsonPath, `${JSON.stringify(manifest, null, 4)}\n`, "utf8");
}

async function copyTemplateFile(sourcePath: string, outputPath: string, context: TemplateContext): Promise<void> {
    await mkdir(dirname(outputPath), { recursive: true });

    if (!shouldRenderAsText(sourcePath)) {
        await copyFile(sourcePath, outputPath);
        return;
    }

    const source = await readFile(sourcePath, "utf8");
    await writeFile(outputPath, renderTemplate(source, context), "utf8");
}

async function copyTemplateDir(sourceDir: string, outputDir: string, context: TemplateContext, createdFiles: string[]): Promise<void> {
    const entries = await readdir(sourceDir, { withFileTypes: true });

    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
        const sourcePath = join(sourceDir, entry.name);
        const outputPath = join(outputDir, renameTemplateEntry(entry.name));

        if (entry.isDirectory()) {
            await copyTemplateDir(sourcePath, outputPath, context, createdFiles);
            continue;
        }

        if (!entry.isFile()) {
            continue;
        }

        await copyTemplateFile(sourcePath, outputPath, context);
        createdFiles.push(outputPath);
    }
}

export async function scaffoldProject(options: ScaffoldProjectOptions): Promise<string[]> {
    const force = options.force ?? false;
    const template = options.template ?? DEFAULT_TEMPLATE;
    const packageName = toPackageName(basename(options.projectDir));
    const context: TemplateContext = {
        displayName: toDisplayName(packageName),
        packageName,
    };

    await prepareProjectDir(options.projectDir, force);

    const templateDir = await resolveTemplateDir(template);
    const createdFiles: string[] = [];

    await copyTemplateDir(templateDir, options.projectDir, context, createdFiles);
    await patchProjectPackageJson(options.projectDir, context);

    return createdFiles.sort();
}
