import { RendererInitializationError } from "../errors/renderer.error";

export class InitializationState {
    private initialized = false;
    private initializing = false;

    public isInitialized(): boolean {
        return this.initialized;
    }

    public isInitializing(): boolean {
        return this.initializing;
    }

    public ensureCanInitialize(): void {
        if (this.initialized || this.initializing) {
            throw RendererInitializationError.alreadyInitialized();
        }
    }

    public markInitializing(): void {
        this.initializing = true;
    }

    public markInitialized(): void {
        this.initializing = false;
        this.initialized = true;
    }

    public reset(): void {
        this.initializing = false;
        this.initialized = false;
    }
}
