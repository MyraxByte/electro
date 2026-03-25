import { setTimeout as sleep } from "node:timers/promises";
import type { ManagedProcess } from "./electron-launcher";

export interface ProcessShutdownOptions {
    mode?: "fast" | "graceful";
    graceMs?: number;
    onGraceTimeout?: () => void | Promise<void>;
}

/**
 * Dev-mode shutdown helper for managed child processes.
 *
 * Fast mode force-kills immediately. Graceful mode sends SIGTERM first, then
 * falls back to SIGKILL after the grace timeout.
 */
export async function terminateManagedProcess(proc: ManagedProcess, options: ProcessShutdownOptions = {}): Promise<void> {
    const mode = options.mode ?? "fast";

    if (mode === "fast") {
        proc.kill("SIGKILL");
        await proc.exited;
        return;
    }

    const graceMs = options.graceMs ?? 5_000;
    const timeout = sleep(graceMs).then(() => "timeout" as const);

    proc.kill("SIGTERM");
    const result = await Promise.race([proc.exited, timeout]);
    if (result !== "timeout") {
        return;
    }

    await options.onGraceTimeout?.();
    proc.kill("SIGKILL");
    await proc.exited;
}
