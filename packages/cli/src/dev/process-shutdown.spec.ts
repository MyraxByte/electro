import { describe, expect, it, vi } from "vitest";
import type { ManagedProcess } from "./electron-launcher";
import { terminateManagedProcess } from "./process-shutdown";

function createDeferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((innerResolve) => {
        resolve = innerResolve;
    });
    return { promise, resolve };
}

describe("terminateManagedProcess()", () => {
    it("force-kills immediately in fast mode", async () => {
        const exited = createDeferred<number | null>();
        const signals: NodeJS.Signals[] = [];

        const proc: ManagedProcess = {
            kill(signal = "SIGTERM") {
                signals.push(signal);
                if (signal === "SIGKILL") {
                    exited.resolve(null);
                }
            },
            exited: exited.promise,
        };

        await terminateManagedProcess(proc, { mode: "fast" });

        expect(signals).toEqual(["SIGKILL"]);
    });

    it("uses graceful shutdown when requested", async () => {
        const signals: NodeJS.Signals[] = [];

        const proc: ManagedProcess = {
            kill(signal = "SIGTERM") {
                signals.push(signal);
            },
            exited: Promise.resolve(0),
        };

        await terminateManagedProcess(proc, { mode: "graceful", graceMs: 1 });

        expect(signals).toEqual(["SIGTERM"]);
    });

    it("falls back to SIGKILL after graceful timeout", async () => {
        const exited = createDeferred<number | null>();
        const signals: NodeJS.Signals[] = [];
        const onGraceTimeout = vi.fn();

        const proc: ManagedProcess = {
            kill(signal = "SIGTERM") {
                signals.push(signal);
                if (signal === "SIGKILL") {
                    exited.resolve(null);
                }
            },
            exited: exited.promise,
        };

        await terminateManagedProcess(proc, {
            mode: "graceful",
            graceMs: 1,
            onGraceTimeout,
        });

        expect(signals).toEqual(["SIGTERM", "SIGKILL"]);
        expect(onGraceTimeout).toHaveBeenCalledTimes(1);
    });
});
