import { Cron } from "croner";
import { InjectionContext } from "../container/injection-context";
import type { Injector } from "../container/injector";
import { JobError } from "../errors/job";
import { JobContext } from "./context";

type Awaitable<T> = T | PromiseLike<T>;

/**
 * Describes a job as provided during module bootstrap.
 *
 * @internal Consumed by {@link JobRegistry.register}; not intended for direct consumer use.
 */
export interface JobDefinitionRecord {
    readonly jobId: string;
    /** Cron expression (Croner syntax). Omit for manually-triggered-only jobs. */
    readonly cron?: string;
    /** The handler to execute. Receives a {@link JobContext} for cancellation/progress, plus any extra args from manual runs. */
    readonly handler: (context: JobContext, ...args: unknown[]) => Awaitable<unknown>;
    /** Injector used to restore the DI context when the handler runs. */
    readonly injector: Injector;
}

/** Lifecycle state of a registered job. */
export type JobStatus = "idle" | "scheduled" | "running";

/** Read-only snapshot of a job's current runtime state. */
export interface JobRuntimeState {
    readonly jobId: string;
    readonly status: JobStatus;
    /** Last reported progress value (0-100). */
    readonly progress: number;
    /** Epoch timestamp of the last completed execution, if any. */
    readonly lastRunAt?: number;
}

interface ActiveJob {
    readonly definition: JobDefinitionRecord;
    status: JobStatus;
    context?: JobContext;
    scheduler?: Cron;
    progress: number;
    lastRunAt?: number;
    runningPromise?: Promise<unknown>;
}

/**
 * Manages the lifecycle of scheduled and manually-triggered jobs.
 *
 * Jobs are registered during bootstrap (via `@internal` {@link register}), then consumers
 * interact through `start`, `stop`, `run`, and `cancel`. Scheduled jobs use Croner for
 * cron-based timing; each execution receives a fresh {@link JobContext} for progress
 * reporting and cooperative cancellation.
 *
 * @example
 * ```ts
 * // Start the cron scheduler for a registered job
 * jobRegistry.start('data:cleanup');
 *
 * // Trigger an immediate (manual) execution
 * await jobRegistry.run('data:cleanup');
 *
 * // Cancel a running execution cooperatively
 * jobRegistry.cancel('data:cleanup');
 *
 * // Stop the cron scheduler and wait for any running execution to finish
 * await jobRegistry.stop('data:cleanup');
 * ```
 */
export class JobRegistry {
    private readonly jobs = new Map<string, ActiveJob>();

    /** @internal Register a job definition during bootstrap. */
    public register(definition: JobDefinitionRecord): void {
        this.jobs.set(definition.jobId, {
            definition,
            status: "idle",
            progress: 0,
        });
    }

    /** Return a snapshot of all registered jobs and their current state. */
    public list(): readonly JobRuntimeState[] {
        return [...this.jobs.values()].map((job) => ({
            jobId: job.definition.jobId,
            status: job.status,
            progress: job.progress,
            lastRunAt: job.lastRunAt,
        }));
    }

    /** Return the current state of a single job, or `undefined` if not registered. */
    public getStatus(jobId: string): JobRuntimeState | undefined {
        const job = this.jobs.get(jobId);
        if (!job) return undefined;

        return {
            jobId: job.definition.jobId,
            status: job.status,
            progress: job.progress,
            lastRunAt: job.lastRunAt,
        };
    }

    /**
     * Start the cron scheduler for a job if it is not already scheduled.
     *
     * Unlike {@link start}, this is idempotent and will not throw if the scheduler
     * is already running.
     */
    public ensure(jobId: string): void {
        const job = this.getJobOrThrow(jobId);
        if (job.scheduler) return;
        this.startScheduler(job);
    }

    /**
     * Start the cron scheduler for a job.
     *
     * @throws {JobError} If the job already has an active scheduler.
     */
    public start(jobId: string): void {
        const job = this.getJobOrThrow(jobId);

        if (job.scheduler) {
            throw JobError.alreadyRunning(jobId);
        }

        this.startScheduler(job);
    }

    /**
     * Trigger an immediate (manual) execution of a job, bypassing the cron schedule.
     *
     * @throws {JobError} If the job is already running.
     * @returns The value returned by the job handler.
     */
    public async run(jobId: string, ...args: unknown[]): Promise<unknown> {
        const job = this.getJobOrThrow(jobId);

        if (job.status === "running") {
            throw JobError.alreadyRunning(jobId);
        }

        return this.executeJob(job, args);
    }

    /**
     * Stop the cron scheduler and cancel any in-flight execution.
     *
     * Waits for the running execution (if any) to settle before returning. The job
     * transitions to `"idle"` once fully stopped.
     */
    public async stop(jobId: string): Promise<void> {
        const job = this.getJobOrThrow(jobId);

        job.scheduler?.stop();
        job.scheduler = undefined;

        if (job.context) {
            job.context.cancel();
        }

        if (job.runningPromise) {
            try {
                await job.runningPromise;
            } catch {
                // Swallow — the original caller gets the error
            }
        }

        job.status = "idle";
    }

    /**
     * Request cooperative cancellation of the currently running execution.
     *
     * Sets the `isCanceled` flag on the job's {@link JobContext}. The handler is
     * responsible for checking this flag and aborting work accordingly.
     */
    public cancel(jobId: string): void {
        const job = this.getJobOrThrow(jobId);

        if (job.context) {
            job.context.cancel();
        }
    }

    /** @internal */
    public async dispose(): Promise<void> {
        for (const [jobId] of this.jobs) {
            await this.stop(jobId);
        }
        this.jobs.clear();
    }

    private getJobOrThrow(jobId: string): ActiveJob {
        const job = this.jobs.get(jobId);
        if (!job) throw JobError.notFound(jobId);
        return job;
    }

    private startScheduler(job: ActiveJob): void {
        if (!job.definition.cron) return;

        job.scheduler = new Cron(job.definition.cron, () => {
            if (job.status === "running") return;
            void this.executeJob(job, []);
        });

        job.status = "scheduled";
    }

    private async executeJob(job: ActiveJob, args: unknown[]): Promise<unknown> {
        const context = new JobContext();
        job.context = context;
        job.status = "running";
        job.progress = 0;

        const promise = (async () => {
            try {
                const result = await InjectionContext.run(job.definition.injector, () => job.definition.handler(context, ...args));
                return result;
            } catch (error) {
                throw JobError.executionFailed(job.definition.jobId, error);
            } finally {
                job.progress = context.progress;
                job.lastRunAt = Date.now();
                job.status = job.scheduler ? "scheduled" : "idle";
                job.context = undefined;
                job.runningPromise = undefined;
            }
        })();

        job.runningPromise = promise;
        return promise;
    }
}
