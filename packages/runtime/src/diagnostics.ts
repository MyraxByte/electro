import {
    formatDiagnosticLine,
    getRuntimeLogger,
    isDevDiagnosticsEnabled,
    resolveDiagnosticTarget,
    type DiagnosticLevel,
    type DiagnosticTarget,
} from "./logging";

export { formatDiagnosticLine, isDevDiagnosticsEnabled, resolveDiagnosticTarget };
export type { DiagnosticLevel };

export function emitDevDiagnostic(code: string, message: string, level: DiagnosticLevel = "electro"): void {
    const logger = getRuntimeLogger().child({ target: code });

    switch (level) {
        case "warn":
            logger.warn(message);
            return;
        case "error":
            logger.error(message);
            return;
        default:
            logger.info(message);
    }
}

export function emitTargetDiagnostic(target: DiagnosticTarget, action: string, level: DiagnosticLevel = "electro"): void {
    emitDevDiagnostic(resolveDiagnosticTarget(target), action, level);
}

export function emitTargetError(target: DiagnosticTarget, action: string, error: unknown): void {
    getRuntimeLogger()
        .child({ target: resolveDiagnosticTarget(target) })
        .error(action, { error });
}
