export type ElectroLogLevel = "debug" | "info" | "warn" | "error";
export type DiagnosticLevel = "electro" | "warn" | "error";
export type DiagnosticTarget = string | object;

export interface ElectroLogBindings {
    readonly target?: string;
}

export interface ElectroLogContext {
    readonly [key: string]: unknown;
}

export interface ElectroLogger {
    debug(message: string, context?: ElectroLogContext): void;
    info(message: string, context?: ElectroLogContext): void;
    warn(message: string, context?: ElectroLogContext): void;
    error(message: string, context?: ElectroLogContext): void;
    child(bindings: ElectroLogBindings): ElectroLogger;
}

function formatTimestamp(now: Date): string {
    return now.toTimeString().slice(0, 8);
}

function mapLevelToLabel(level: DiagnosticLevel): string {
    return level === "electro" ? "electro" : level;
}

function shouldWrite(level: ElectroLogLevel, env: NodeJS.ProcessEnv): boolean {
    if (level === "warn" || level === "error") {
        return true;
    }

    return env.ELECTRO_DEV === "true";
}

function normalizeContextValue(value: unknown): unknown {
    if (value instanceof Error) {
        return {
            name: value.name,
            message: value.message,
            stack: value.stack,
        };
    }

    return value;
}

function formatContext(context?: ElectroLogContext): string {
    if (!context) {
        return "";
    }

    const entries = Object.entries(context).filter(([, value]) => value !== undefined);
    if (entries.length === 0) {
        return "";
    }

    try {
        return ` ${JSON.stringify(Object.fromEntries(entries.map(([key, value]) => [key, normalizeContextValue(value)])))}`;
    } catch {
        return " [unserializable context]";
    }
}

export function isDevDiagnosticsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
    return env.ELECTRO_DEV === "true";
}

export function formatDiagnosticLine(level: DiagnosticLevel, code: string, message: string, now: Date = new Date()): string {
    return `${formatTimestamp(now)} [${mapLevelToLabel(level)}] ${code} → ${message}`;
}

export function resolveDiagnosticTarget(target: DiagnosticTarget, fallback = "Electro"): string {
    if (typeof target === "string" && target.trim().length > 0) {
        return target;
    }

    const name = target.constructor?.name?.trim();
    return name && name.length > 0 ? name : fallback;
}

class ConsoleElectroLogger implements ElectroLogger {
    public constructor(
        private readonly bindings: ElectroLogBindings = {},
        private readonly env: NodeJS.ProcessEnv = process.env,
    ) {}

    public debug(message: string, context?: ElectroLogContext): void {
        this.write("debug", message, context);
    }

    public info(message: string, context?: ElectroLogContext): void {
        this.write("info", message, context);
    }

    public warn(message: string, context?: ElectroLogContext): void {
        this.write("warn", message, context);
    }

    public error(message: string, context?: ElectroLogContext): void {
        this.write("error", message, context);
    }

    public child(bindings: ElectroLogBindings): ElectroLogger {
        return new ConsoleElectroLogger({ ...this.bindings, ...bindings }, this.env);
    }

    private write(level: ElectroLogLevel, message: string, context?: ElectroLogContext): void {
        if (!shouldWrite(level, this.env)) {
            return;
        }

        const target = resolveDiagnosticTarget(this.bindings.target ?? "Electro");
        const diagnosticLevel: DiagnosticLevel = level === "warn" ? "warn" : level === "error" ? "error" : "electro";
        const line = formatDiagnosticLine(diagnosticLevel, target, `${message}${formatContext(context)}`);
        console.log(line);
    }
}

const fallbackRuntimeLogger = new ConsoleElectroLogger();
let activeRuntimeLogger: ElectroLogger | undefined;

export function createConsoleLogger(): ElectroLogger {
    return new ConsoleElectroLogger();
}

export function getRuntimeLogger(): ElectroLogger {
    return activeRuntimeLogger ?? fallbackRuntimeLogger;
}

export function setRuntimeLogger(logger?: ElectroLogger): void {
    activeRuntimeLogger = logger;
}
