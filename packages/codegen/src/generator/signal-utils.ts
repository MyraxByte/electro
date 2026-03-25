import type { ScannedModule, ScannedSignal } from "../types";

export interface ResolvedSignalEntry {
    readonly signal: ScannedSignal;
    readonly filePath: string;
}

function signalSourcePriority(signal: ScannedSignal): number {
    switch (signal.source) {
        case "decorator":
            return 400;
        case "publish":
            switch (signal.payload.kind) {
                case "method-parameter-pick":
                    return 350;
                case "method-parameter":
                    return 340;
                case "void":
                    return 330;
                case "unknown":
                    return 320;
            }
        case "subscribe":
            return 100;
    }
}

function shouldReplaceSignal(current: ScannedSignal, candidate: ScannedSignal): boolean {
    return signalSourcePriority(candidate) > signalSourcePriority(current);
}

export function collectSignals(modules: readonly ScannedModule[]): Map<string, ResolvedSignalEntry> {
    const seen = new Map<string, ResolvedSignalEntry>();

    const visit = (signal: ScannedSignal, filePath: string) => {
        const current = seen.get(signal.id);

        if (!current || shouldReplaceSignal(current.signal, signal)) {
            seen.set(signal.id, { signal, filePath });
        }
    };

    for (const module of modules) {
        for (const signal of module.signals) {
            visit(signal, module.filePath);
        }

        for (const provider of module.providers) {
            for (const signal of provider.signals) {
                visit(signal, provider.filePath);
            }
        }
    }

    return seen;
}
