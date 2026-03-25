/**
 * Execution context passed to every job handler invocation.
 *
 * Provides cooperative cancellation and progress reporting. The handler should
 * periodically check {@link isCanceled} and abort work when it returns `true`.
 *
 * @example
 * ```ts
 * async function cleanupHandler(ctx: JobContext) {
 *     const items = await fetchItems();
 *     for (let i = 0; i < items.length; i++) {
 *         if (ctx.isCanceled) return;
 *         await processItem(items[i]);
 *         ctx.setProgress((i / items.length) * 100);
 *     }
 * }
 * ```
 */
export class JobContext {
    private canceledInternal = false;
    private progressInternal = 0;

    /** Whether cancellation has been requested for this execution. */
    public get isCanceled(): boolean {
        return this.canceledInternal;
    }

    /** Current progress value, clamped to 0-100. */
    public get progress(): number {
        return this.progressInternal;
    }

    /**
     * Report execution progress.
     *
     * @remarks Values are clamped to the 0-100 range.
     */
    public setProgress(value: number): void {
        this.progressInternal = Math.max(0, Math.min(100, value));
    }

    /** @internal */
    public cancel(): void {
        this.canceledInternal = true;
    }
}
