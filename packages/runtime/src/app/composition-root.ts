import type { Constructor } from "@electro/common";
import { Injector } from "../container/injector";
import type { ModuleRef } from "../modules/refs";
import type { AppDefinition } from "../modules/scanner";
import { scanModules } from "../modules/scanner";
import { validateAppDefinition } from "../modules/validator";
import { loadModules } from "./instance-loader";

/**
 * Orchestrates the bootstrap pipeline: scan -> validate -> create injector -> load modules.
 *
 * This is an internal coordination point used by {@link AppKernel}. It holds the
 * immutable results of composition (definition, root injector, loaded module refs)
 * so the kernel can proceed with capability installation and lifecycle execution.
 *
 * @internal
 */
export class CompositionRoot {
    /** The validated static app definition produced by the scanner. */
    public readonly definition: AppDefinition;
    /** The top-level DI injector containing framework services. */
    public readonly rootInjector: Injector;
    /** All loaded modules in dependency-first (boot) order. */
    public readonly moduleRefs: readonly ModuleRef[];

    private constructor(definition: AppDefinition, rootInjector: Injector, moduleRefs: readonly ModuleRef[]) {
        this.definition = definition;
        this.rootInjector = rootInjector;
        this.moduleRefs = moduleRefs;
    }

    /**
     * Runs the full composition pipeline: scan metadata, validate, create root injector,
     * and load all modules in topological order.
     *
     * @param registerFrameworkServices - Optional callback to register framework-level
     *   singletons (e.g. SignalBus, ModuleRegistry) into the root injector before
     *   modules are loaded.
     */
    public static create(rootModule: Constructor, registerFrameworkServices?: (injector: Injector) => void): CompositionRoot {
        // 1. Scan metadata
        const definition = scanModules(rootModule);

        // 2. Validate
        validateAppDefinition(definition);

        // 3. Create root injector and register framework services
        const rootInjector = new Injector();
        registerFrameworkServices?.(rootInjector);

        // 4. Load modules (instantiate in boot order)
        const moduleRefs = loadModules(definition, rootInjector);

        return new CompositionRoot(definition, rootInjector, moduleRefs);
    }
}
