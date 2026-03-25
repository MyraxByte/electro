import type { Constructor } from "@electro/common";
import { getViewMetadata, getWindowMetadata } from "@electro/common";
import { BootstrapError } from "../errors/bootstrap";
import type { AppDefinition, ModuleDefinition } from "./scanner";

/**
 * Validates a scanned {@link AppDefinition} for structural correctness before bootstrap.
 *
 * Checks performed:
 * - Unique module IDs
 * - Exports reference declared providers
 * - No cyclic module imports
 * - Unique view/window IDs
 * - Unique bridge channel names
 * - Unique job IDs
 * - Provider role exclusivity (a class cannot be both a view and a window)
 * - View access references point to existing bridge channels
 *
 * @throws {BootstrapError} On the first validation failure encountered.
 */
export function validateAppDefinition(definition: AppDefinition): void {
    validateUniqueModuleIds(definition.modules);
    validateExports(definition);
    validateNoCyclicImports(definition);
    validateUniqueViewIds(definition);
    validateUniqueWindowIds(definition);
    validateUniqueBridgeChannels(definition);
    validateUniqueJobIds(definition);
    validateProviderRoles(definition);
    validateViewAccessReferences(definition);
}

function validateUniqueModuleIds(modules: readonly ModuleDefinition[]): void {
    const seen = new Set<string>();

    for (const module of modules) {
        if (seen.has(module.id)) {
            throw BootstrapError.duplicateModuleId(module.id);
        }
        seen.add(module.id);
    }
}

function validateExports(definition: AppDefinition): void {
    for (const module of definition.modules) {
        const providerTargets = new Set(module.providers.map((p) => p.target));

        for (const exported of module.exportTargets) {
            if (!providerTargets.has(exported)) {
                throw BootstrapError.invalidExport(module.id, exported.name);
            }
        }
    }
}

function validateNoCyclicImports(definition: AppDefinition): void {
    const moduleById = new Map<Constructor, ModuleDefinition>();
    for (const module of definition.modules) {
        moduleById.set(module.target, module);
    }

    const visited = new Set<Constructor>();
    const visiting = new Set<Constructor>();
    const path: string[] = [];

    const visit = (target: Constructor): void => {
        if (visited.has(target)) return;

        const module = moduleById.get(target);
        if (!module) return;

        if (visiting.has(target)) {
            throw BootstrapError.circularModuleImport([...path, module.id]);
        }

        visiting.add(target);
        path.push(module.id);

        for (const imported of module.imports) {
            visit(imported);
        }

        path.pop();
        visiting.delete(target);
        visited.add(target);
    };

    visit(definition.rootModule);
}

function validateUniqueViewIds(definition: AppDefinition): void {
    const seen = new Set<string>();

    for (const view of definition.views) {
        if (seen.has(view.id)) {
            throw BootstrapError.duplicateViewId(view.id);
        }
        seen.add(view.id);
    }
}

function validateUniqueWindowIds(definition: AppDefinition): void {
    const seen = new Set<string>();

    for (const window of definition.windows) {
        if (seen.has(window.id)) {
            throw BootstrapError.duplicateWindowId(window.id);
        }
        seen.add(window.id);
    }
}

function validateUniqueBridgeChannels(definition: AppDefinition): void {
    const seen = new Set<string>();

    for (const method of definition.bridgeMethods) {
        if (seen.has(method.channel)) {
            throw BootstrapError.duplicateBridgeChannel(method.channel);
        }
        seen.add(method.channel);
    }
}

function validateUniqueJobIds(definition: AppDefinition): void {
    const seen = new Set<string>();

    for (const job of definition.jobs) {
        if (seen.has(job.jobId)) {
            throw BootstrapError.duplicateJobId(job.jobId);
        }
        seen.add(job.jobId);
    }
}

function validateProviderRoles(definition: AppDefinition): void {
    for (const provider of definition.providers) {
        const hasView = getViewMetadata(provider.target) !== undefined;
        const hasWindow = getWindowMetadata(provider.target) !== undefined;

        if (hasView && hasWindow) {
            throw BootstrapError.invalidProviderRoleCombination(provider.target.name);
        }
    }
}

function validateViewAccessReferences(definition: AppDefinition): void {
    const allChannels = new Set(definition.bridgeMethods.map((m) => m.channel));

    for (const view of definition.views) {
        for (const channel of view.access) {
            if (!allChannels.has(channel)) {
                throw BootstrapError.invalidViewAccessReference(view.id, channel);
            }
        }
    }
}
