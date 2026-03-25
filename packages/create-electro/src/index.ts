import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { scaffoldProject } from "./scaffold";

interface CliOptions {
    readonly force: boolean;
    readonly help: boolean;
    readonly targetDir: string;
}

function printHelp(): void {
    console.log(`create-electro

Usage:
  npm create electro@latest [project-name]
  pnpm create electro [project-name]

Options:
  -f, --force    Overwrite scaffold files in a non-empty directory
  -h, --help     Show this help message
`);
}

function parseArgs(argv: readonly string[]): CliOptions {
    let force = false;
    let help = false;
    let targetDir = "electro-app";

    for (const argument of argv) {
        if (argument === "--force" || argument === "-f") {
            force = true;
            continue;
        }

        if (argument === "--help" || argument === "-h") {
            help = true;
            continue;
        }

        if (argument.startsWith("-")) {
            throw new Error(`Unknown option "${argument}".`);
        }

        targetDir = argument;
    }

    return {
        force,
        help,
        targetDir,
    };
}

function formatNextStepTarget(targetDir: string): string | null {
    if (targetDir === "." || targetDir === "./") {
        return null;
    }

    return targetDir;
}

export async function runCli(argv: readonly string[] = process.argv.slice(2)): Promise<void> {
    const options = parseArgs(argv);

    if (options.help) {
        printHelp();
        return;
    }

    const targetDir = resolve(process.cwd(), options.targetDir);
    const projectName = basename(targetDir);
    const createdFiles = await scaffoldProject({
        force: options.force,
        projectDir: targetDir,
        projectName,
    });

    console.log(`\nScaffolded Electro app in ${targetDir}`);
    console.log(`Created ${createdFiles.length} file(s).\n`);
    console.log("Next steps:");

    const nextStepTarget = formatNextStepTarget(options.targetDir);
    if (nextStepTarget) {
        console.log(`  cd ${nextStepTarget}`);
    }

    console.log("  pnpm install");
    console.log("  pnpm run dev");
}

const entryPath = process.argv[1];

if (entryPath && resolve(entryPath) === fileURLToPath(import.meta.url)) {
    await runCli(process.argv.slice(2)).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(message);
        process.exitCode = 1;
    });
}
