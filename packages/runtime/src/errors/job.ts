import { RuntimeError } from "./runtime";

/**
 * Errors thrown by the job scheduling and execution subsystem.
 *
 * All instances are created through static factory methods; direct construction is not allowed.
 */
export class JobError extends RuntimeError {
    private constructor(message: string, code: string, context?: Readonly<Record<string, unknown>>) {
        super(message, code, context);
    }

    /** No job handler has been registered under the given job id. */
    public static notFound(jobId: string): JobError {
        return new JobError(`Job "${jobId}" is not registered.`, "ELECTRO_JOB_NOT_FOUND", { jobId });
    }

    /** The job is already executing and does not support concurrent runs. */
    public static alreadyRunning(jobId: string): JobError {
        return new JobError(`Job "${jobId}" is already running.`, "ELECTRO_JOB_ALREADY_RUNNING", { jobId });
    }

    /**
     * A job handler threw during execution.
     *
     * @remarks
     * The original error is attached as {@link Error.cause}.
     */
    public static executionFailed(jobId: string, cause: unknown): JobError {
        const error = new JobError(`Job "${jobId}" execution failed.`, "ELECTRO_JOB_EXECUTION_FAILED", { jobId });
        error.cause = cause;
        return error;
    }
}
