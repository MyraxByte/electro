import type { Constructor } from "@electro/common";
import type { Injector } from "../container/injector";
import { BootstrapError } from "../errors/bootstrap";
import type { LifecycleTarget } from "../modules/refs";
import { ModuleRef, ProviderRef } from "../modules/refs";
import type { AppDefinition, ModuleDefinition } from "../modules/scanner";

function computeBootOrder(definition: AppDefinition): readonly ModuleDefinition[] {
    const moduleByTarget = new Map<Constructor, ModuleDefinition>();
    for (const module of definition.modules) {
        moduleByTarget.set(module.target, module);
    }

    const visited = new Set<Constructor>();
    const ordered: ModuleDefinition[] = [];

    const visit = (target: Constructor): void => {
        if (visited.has(target)) return;
        visited.add(target);

        const module = moduleByTarget.get(target);
        if (!module) return;

        for (const imported of module.imports) {
            visit(imported);
        }

        ordered.push(module);
    };

    visit(definition.rootModule);
    return ordered;
}

/**
 * Instantiates all modules and their providers in dependency-first (topological) order.
 *
 * For each module:
 * 1. Creates a child injector scoped to the module.
 * 2. Hydrates exported providers from imported modules into the child injector.
 * 3. Registers and resolves all declared providers.
 * 4. Instantiates the module class itself.
 * 5. Links import references between module refs.
 *
 * Returns module refs ordered by boot sequence (dependencies before dependents).
 *
 * @internal
 * @throws {BootstrapError} If an imported module has not been loaded yet (should not
 *   happen with correct topological ordering).
 */
export function loadModules(definition: AppDefinition, rootInjector: Injector): readonly ModuleRef[] {
    const bootOrder = computeBootOrder(definition);
    const moduleRefByTarget = new Map<Constructor, ModuleRef>();

    for (const moduleDef of bootOrder) {
        const moduleInjector = rootInjector.createChild();
        const providerDefs = moduleDef.providers;

        // Hydrate imported exports
        for (const importedTarget of moduleDef.imports) {
            const importedRef = moduleRefByTarget.get(importedTarget);
            if (!importedRef) {
                throw BootstrapError.importedModuleNotLoaded(moduleDef.id, importedTarget.name);
            }

            for (const exportedProvider of importedRef.exportedProviders) {
                moduleInjector.provideValue(exportedProvider.target, importedRef.injector.get(exportedProvider.target));
            }
        }

        // Register declared providers
        for (const providerDef of providerDefs) {
            moduleInjector.provide(providerDef.target);
        }

        // Register module itself
        moduleInjector.provide(moduleDef.target);

        // Instantiate module
        const moduleInstance = moduleInjector.get(moduleDef.target) as LifecycleTarget;

        // Instantiate providers
        const providerRefs = providerDefs.map((providerDef) => {
            const instance = moduleInjector.get(providerDef.target) as LifecycleTarget;
            return new ProviderRef(providerDef, instance, moduleInjector);
        });

        const moduleRef = new ModuleRef(moduleDef.id, moduleDef.target, moduleInjector, moduleInstance, providerRefs, new Set(moduleDef.exportTargets));

        // Link imports
        const importRefs = moduleDef.imports.map((t) => moduleRefByTarget.get(t)).filter((ref): ref is ModuleRef => ref !== undefined);
        moduleRef.linkImports(importRefs);

        moduleRefByTarget.set(moduleDef.target, moduleRef);
    }

    return bootOrder.map((m) => moduleRefByTarget.get(m.target)!);
}
