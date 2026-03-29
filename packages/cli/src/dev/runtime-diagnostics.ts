const yellow = "\x1b[33m";
const green = "\x1b[32m";
const red = "\x1b[31m";
const cyan = "\x1b[36m";
const magenta = "\x1b[35m";
const dim = "\x1b[90m";
const bold = "\x1b[1m";
const reset = "\x1b[0m";

export type RuntimeDiagnosticsMode = "pretty" | "raw";

export interface ParsedDiagnosticLine {
    readonly time: string;
    readonly tag: "electro" | "warn" | "error";
    readonly code: string;
    readonly message: string;
}

export interface RuntimeDiagnosticsFormatter {
    formatLine(line: string): string[];
    flush(): string[];
}

// Match runtime diagnostic lines: "HH:MM:SS [tag] code → message"
// biome-ignore lint/complexity/useRegexLiterals: readability
const DIAGNOSTIC_LINE_RE = new RegExp(String.raw`^(\d{2}:\d{2}:\d{2}) \[(electro|warn|error)\] (.+?) \u2192 (.+)$`);

const KERNEL_PHASES = new Set(["initializing", "initialized", "starting", "started", "stopping", "stopped", "failed"]);
const MODULE_PHASE_COMPLETIONS = new Set(["initialized", "started", "stopped", "failed"]);
const MODULE_PHASE_BEGINS = new Set(["initializing", "starting", "stopping"]);

function parseDiagnosticLine(line: string): ParsedDiagnosticLine | null {
    const match = line.match(DIAGNOSTIC_LINE_RE);
    if (!match) return null;

    const [, time, tag, code, message] = match;
    return {
        time: time!,
        tag: tag as ParsedDiagnosticLine["tag"],
        code: code!,
        message: message!,
    };
}

function colorTag(tag: ParsedDiagnosticLine["tag"]): string {
    if (tag === "error") return `${red}[${tag}]${reset}`;
    if (tag === "warn") return `${yellow}[${tag}]${reset}`;
    return `${yellow}[${tag}]${reset}`;
}

function formatRawDiagnostic(parsed: ParsedDiagnosticLine): string {
    return `${dim}${parsed.time}${reset} ${colorTag(parsed.tag)} ${dim}${parsed.code}${reset} \u2192 ${parsed.message}`;
}

function formatKernelLine(parsed: ParsedDiagnosticLine, suffix = ""): string {
    return `${dim}${parsed.time}${reset} ${colorTag(parsed.tag)} ${bold}kernel${reset} ${parsed.message}${suffix}`;
}

function formatModuleCompletion(code: string, phase: string): string {
    return `  ${green}\u2713${reset} ${code} ${phase}`;
}

function formatUiDiagnostic(code: string, message: string): string {
    return `  ${cyan}ui${reset} ${code} ${message}`;
}

function formatAppDiagnostic(message: string): string {
    return `  ${magenta}app${reset} ${message}`;
}

function isKernelLifecycle(parsed: ParsedDiagnosticLine): boolean {
    return parsed.code === "AppKernel" && KERNEL_PHASES.has(parsed.message);
}

function isModuleLifecycle(parsed: ParsedDiagnosticLine): boolean {
    return parsed.code.endsWith("Module") && (MODULE_PHASE_BEGINS.has(parsed.message) || MODULE_PHASE_COMPLETIONS.has(parsed.message));
}

function isUiDiagnostic(parsed: ParsedDiagnosticLine): boolean {
    return parsed.code.endsWith("Window") || parsed.code.endsWith("View");
}

function shouldShowUiDiagnostic(parsed: ParsedDiagnosticLine): boolean {
    if (parsed.code === "MainWindow" && parsed.message === "created") {
        return true;
    }

    if (parsed.code.endsWith("Window") && parsed.message === "shown") {
        return true;
    }

    if (parsed.code.endsWith("View") && parsed.message.startsWith("loaded ")) {
        return true;
    }

    return false;
}

function formatAppMessage(line: string): string | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("at ") || trimmed.startsWith("Error:") || /^\w*Error\b/.test(trimmed)) {
        return line;
    }

    if (trimmed.startsWith("Skip checkForUpdates because application is not packed")) {
        return formatAppDiagnostic(`updater skipped update check ${dim}(dev build)${reset}`);
    }

    return formatAppDiagnostic(trimmed);
}

class PrettyRuntimeDiagnosticsFormatter implements RuntimeDiagnosticsFormatter {
    private currentPhase: ParsedDiagnosticLine["message"] | null = null;
    private currentPhaseModuleCount = 0;

    public formatLine(line: string): string[] {
        const parsed = parseDiagnosticLine(line);
        if (!parsed) {
            const appLine = formatAppMessage(line);
            return appLine ? [appLine] : [];
        }

        if (parsed.tag !== "electro") {
            return [formatRawDiagnostic(parsed)];
        }

        if (isKernelLifecycle(parsed)) {
            if (parsed.message === "initializing" || parsed.message === "starting" || parsed.message === "stopping") {
                this.currentPhase = parsed.message;
                this.currentPhaseModuleCount = 0;
                return [formatKernelLine(parsed)];
            }

            const suffix = this.currentPhaseModuleCount > 0 ? ` ${dim}(${this.currentPhaseModuleCount} modules)${reset}` : "";
            this.currentPhase = null;
            this.currentPhaseModuleCount = 0;
            return [formatKernelLine(parsed, suffix)];
        }

        if (isModuleLifecycle(parsed)) {
            if (MODULE_PHASE_BEGINS.has(parsed.message)) {
                return [];
            }

            this.currentPhaseModuleCount += 1;
            return [formatModuleCompletion(parsed.code, parsed.message)];
        }

        if (isUiDiagnostic(parsed)) {
            if (!shouldShowUiDiagnostic(parsed)) {
                return [];
            }
            return [formatUiDiagnostic(parsed.code, parsed.message)];
        }

        return [formatRawDiagnostic(parsed)];
    }

    public flush(): string[] {
        return [];
    }
}

class RawRuntimeDiagnosticsFormatter implements RuntimeDiagnosticsFormatter {
    public formatLine(line: string): string[] {
        const parsed = parseDiagnosticLine(line);
        return [parsed ? formatRawDiagnostic(parsed) : line];
    }

    public flush(): string[] {
        return [];
    }
}

export function createRuntimeDiagnosticsFormatter(mode: RuntimeDiagnosticsMode = "pretty"): RuntimeDiagnosticsFormatter {
    return mode === "raw" ? new RawRuntimeDiagnosticsFormatter() : new PrettyRuntimeDiagnosticsFormatter();
}
