import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { type PackageTypeTarget, generate as generateFiles, scan } from "@electrojs/codegen";
import { loadConfig } from "../dev/config-loader";
import { getViewRoot } from "../dev/views";
import { validateViews } from "../validate";

interface GenerateOptions {
    config: string;
    output: string;
}

export async function generate(options: GenerateOptions): Promise<void> {
    const loaded = await loadConfig(options.config);
    const root = loaded.root;
    const outputDir = resolve(root, options.output);
    console.log("Loaded config");

    // 2. Scan source files
    const srcDir = loaded.scanDir;
    console.log(`Scanning ${srcDir}...`);
    const scanResult = await scan(srcDir);
    const views = loaded.views;
    validateViews(views);
    console.log(
        `Found ${scanResult.modules.length} module(s), ` +
            `${scanResult.windows.length} window(s), ` +
            `${scanResult.views.length} runtime view(s), ` +
            `${views.length} build view(s)`,
    );

    // 3. Build package type targets
    const packageTargets: PackageTypeTarget[] = views.map((view) => ({
        packageRoot: getViewRoot(view),
        viewId: view.id,
    }));

    // 4. Generate output files
    const { files, envTypes, packageTypes } = generateFiles({ scanResult, views, outputDir, srcDir, packageTargets });
    console.log(`Generating ${files.length + 1 + packageTypes.length} file(s)...`);

    // 5. Write to disk
    await removeStaleCodegenArtifacts(outputDir);
    for (const file of files) {
        const fullPath = resolve(outputDir, file.path);
        await mkdir(dirname(fullPath), { recursive: true });
        await writeFile(fullPath, file.content);
        console.log(`  ${relative(root, fullPath)}`);
    }

    const envTypesPath = resolve(srcDir, envTypes.path);
    await mkdir(dirname(envTypesPath), { recursive: true });
    await writeFile(envTypesPath, envTypes.content);
    console.log(`  ${relative(root, envTypesPath)}`);

    // 6. Write per-package electro-env.d.ts
    for (const pkg of packageTypes) {
        const packageEnvPath = join(pkg.packageRoot, pkg.path);
        await mkdir(dirname(packageEnvPath), { recursive: true });
        await writeFile(packageEnvPath, pkg.content);
        console.log(`  ${relative(root, packageEnvPath)}`);
    }

    console.log("Done.");
}

async function removeStaleCodegenArtifacts(outputDir: string): Promise<void> {
    await rm(resolve(outputDir, "generated/views"), { recursive: true, force: true });
    await rm(resolve(outputDir, "generated/renderer-env.d.ts"), { force: true });
}
