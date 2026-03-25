import { describe, expect, it } from "vitest";
import { InitializationState } from "../../src/core/initialization-state";
import { RendererInitializationError } from "../../src/errors/renderer.error";

describe("InitializationState", () => {
    it("starts in non-initialized state", () => {
        const state = new InitializationState();

        expect(state.isInitialized()).toBe(false);
        expect(state.isInitializing()).toBe(false);
    });

    it("marks initializing", () => {
        const state = new InitializationState();

        state.markInitializing();

        expect(state.isInitializing()).toBe(true);
        expect(state.isInitialized()).toBe(false);
    });

    it("marks initialized", () => {
        const state = new InitializationState();

        state.markInitializing();
        state.markInitialized();

        expect(state.isInitializing()).toBe(false);
        expect(state.isInitialized()).toBe(true);
    });

    it("resets state", () => {
        const state = new InitializationState();

        state.markInitializing();
        state.markInitialized();
        state.reset();

        expect(state.isInitializing()).toBe(false);
        expect(state.isInitialized()).toBe(false);
    });

    it("throws when already initialized", () => {
        const state = new InitializationState();

        state.markInitializing();
        state.markInitialized();

        expect(() => state.ensureCanInitialize()).toThrow(RendererInitializationError);
        expect(() => state.ensureCanInitialize()).toThrow(/can only be called once/i);
    });

    it("throws when already initializing", () => {
        const state = new InitializationState();

        state.markInitializing();

        expect(() => state.ensureCanInitialize()).toThrow(RendererInitializationError);
        expect(() => state.ensureCanInitialize()).toThrow(/can only be called once/i);
    });
});
