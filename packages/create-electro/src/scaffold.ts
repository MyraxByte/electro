import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FRAMEWORK_VERSION = "2.0.0";
const PACKAGE_MANAGER = "pnpm@10.32.1";
const TYPESCRIPT_VERSION = "^6.0.2";
const NODE_TYPES_VERSION = "^25.5.0";
const VITE_VERSION = "^8.0.2";
const ELECTRON_VERSION = "41.0.4";
const REACT_VERSION = "^19.2.4";
const REACT_TYPES_VERSION = "^19.2.14";
const REACT_DOM_TYPES_VERSION = "^19.2.3";
const VITE_REACT_PLUGIN_VERSION = "^6.0.1";

const TEMPLATE_ROOT = fileURLToPath(new URL("../template/monorepo", import.meta.url));

interface ScaffoldProjectOptions {
    readonly force: boolean;
    readonly projectDir: string;
    readonly projectName: string;
}

interface TemplateContext {
    readonly packageName: string;
    readonly displayName: string;
}

function toPackageName(value: string): string {
    const normalized = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    return normalized.length > 0 ? normalized : "electro-app";
}

function toTitleCase(value: string): string {
    return value
        .split(/[^a-zA-Z0-9]+/)
        .filter((part) => part.length > 0)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function createTemplateContext(projectName: string): TemplateContext {
    const packageName = toPackageName(projectName);

    return {
        packageName,
        displayName: toTitleCase(packageName),
    };
}

function createTemplateReplacements(context: TemplateContext): Readonly<Record<string, string>> {
    return {
        __DISPLAY_NAME__: context.displayName,
        __ELECTRON_VERSION__: ELECTRON_VERSION,
        __FRAMEWORK_VERSION__: FRAMEWORK_VERSION,
        __NODE_TYPES_VERSION__: NODE_TYPES_VERSION,
        __PACKAGE_MANAGER__: PACKAGE_MANAGER,
        __PACKAGE_NAME__: context.packageName,
        __REACT_DOM_TYPES_VERSION__: REACT_DOM_TYPES_VERSION,
        __REACT_TYPES_VERSION__: REACT_TYPES_VERSION,
        __REACT_VERSION__: REACT_VERSION,
        __TYPESCRIPT_VERSION__: TYPESCRIPT_VERSION,
        __VITE_REACT_PLUGIN_VERSION__: VITE_REACT_PLUGIN_VERSION,
        __VITE_VERSION__: VITE_VERSION,
    };
}

function renderTemplateContent(content: string, replacements: Readonly<Record<string, string>>): string {
    let rendered = content;

    for (const [token, value] of Object.entries(replacements)) {
        rendered = rendered.replaceAll(token, value);
    }

    return rendered;
}

async function pathExists(path: string): Promise<boolean> {
    try {
        await stat(path);
        return true;
    } catch {
        return false;
    }
}

async function ensureWritableProjectDir(projectDir: string, force: boolean): Promise<void> {
    const exists = await pathExists(projectDir);
    if (!exists) {
        await mkdir(projectDir, { recursive: true });
        return;
    }

    const entries = await readdir(projectDir);
    if (entries.length > 0 && !force) {
        throw new Error(`Target directory "${projectDir}" is not empty. Use --force to overwrite scaffold files.`);
    }
}

async function collectTemplateFiles(root: string, currentDir = root): Promise<string[]> {
    const entries = await readdir(currentDir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
        const absolutePath = join(currentDir, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await collectTemplateFiles(root, absolutePath)));
            continue;
        }

        if (entry.isFile()) {
            files.push(absolutePath);
        }
    }

    return files.sort();
}

async function writeTemplateFiles(projectDir: string, context: TemplateContext): Promise<string[]> {
    const replacements = createTemplateReplacements(context);
    const templateFiles = await collectTemplateFiles(TEMPLATE_ROOT);
    const createdFiles: string[] = [];

    for (const templatePath of templateFiles) {
        const relativePath = templatePath.slice(TEMPLATE_ROOT.length + 1);
        const outputPath = join(projectDir, relativePath);
        const source = await readFile(templatePath, "utf8");
        const content = renderTemplateContent(source, replacements);

        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, content, "utf8");
        createdFiles.push(outputPath);
    }

    return createdFiles.sort();
}

export async function scaffoldProject(options: ScaffoldProjectOptions): Promise<string[]> {
    await ensureWritableProjectDir(options.projectDir, options.force);
    return writeTemplateFiles(options.projectDir, createTemplateContext(options.projectName));
}
