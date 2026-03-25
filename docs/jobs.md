# Jobs

Jobs are background tasks that run in the Runtime. They can be scheduled via cron expressions or triggered manually. Jobs are isolated from the UI and designed for work that does not need direct user interaction: syncing data, cleanup, health checks, batch processing.

---

## Defining a Job

Use the `@job` decorator on a method inside an `@Injectable` class. The method becomes a registered background task.

```ts
import { Injectable, job } from "@electrojs/common";
import { JobContext } from "@electrojs/runtime";

@Injectable()
export class SyncService {
    private readonly http = inject(HttpService);
    private readonly state = inject(AppState);

    // Runs automatically every hour
    @job({ id: "sync:user-data", cron: "0 * * * *" })
    async syncUserData(context: JobContext): Promise<void> {
        const changes = await this.http.get("/api/sync/changes");

        for (const change of changes) {
            if (context.isCanceled) return; // ← always check for cancellation
            this.state.applyChange(change);
        }
    }

    // No cron — must be triggered manually
    @job({ id: "sync:full" })
    async fullSync(context: JobContext): Promise<void> {
        const data = await this.http.get("/api/sync/full");
        // ...
    }
}
```

### `@job` Options

| Option | Type     | Description                                                               |
| ------ | -------- | ------------------------------------------------------------------------- |
| `id`   | `string` | Unique identifier for this job across the application                     |
| `cron` | `string` | Optional cron expression. If omitted, the job must be triggered manually. |

---

## Cron Expressions

Electro uses standard 5-field cron syntax (minute, hour, day-of-month, month, day-of-week):

```
┌──── minute      (0–59)
│ ┌── hour        (0–23)
│ │ ┌ day-of-month (1–31)
│ │ │ ┌ month      (1–12)
│ │ │ │ ┌ day-of-week (0–6, Sunday = 0)
│ │ │ │ │
* * * * *
```

Common patterns:

| Expression      | Meaning                             |
| --------------- | ----------------------------------- |
| `"0 * * * *"`   | Every hour, on the hour             |
| `"*/5 * * * *"` | Every 5 minutes                     |
| `"0 3 * * *"`   | Every day at 3:00 AM                |
| `"0 9 * * 1-5"` | Weekdays at 9:00 AM                 |
| `"0 3 * * 0"`   | Every Sunday at 3:00 AM             |
| `"30 2 1 * *"`  | First day of every month at 2:30 AM |

---

## `JobContext`

Every job method receives a `JobContext` as its first argument. It provides execution metadata and cancellation support.

| Property     | Type      | Description                                                    |
| ------------ | --------- | -------------------------------------------------------------- |
| `isCanceled` | `boolean` | `true` if the job has been asked to stop. Check this in loops. |
| `progress`   | `number`  | Writable. Report completion percentage (0–100).                |

```ts
@job({ id: "export:data", cron: "0 2 * * *" })
async exportData(context: JobContext): Promise<void> {
    const records = await this.fetchAllRecords();

    for (let i = 0; i < records.length; i++) {
        if (context.isCanceled) {
            console.log("[Export] Cancelled after", i, "records");
            return;
        }

        await this.writeRecord(records[i]);
        context.progress = ((i + 1) / records.length) * 100;
    }
}
```

---

## Managing Jobs with `JobRegistry`

Jobs are managed through `JobRegistry`, which is injectable anywhere in the runtime.

```ts
@Module({ id: "sync", providers: [SyncService] })
export class SyncModule {
    private readonly jobs = inject(JobRegistry);

    async onReady() {
        // ensure() → starts the job if it is not already running
        this.jobs.ensure("sync:user-data");
    }

    async onShutdown() {
        // Gracefully cancel and wait for completion
        await this.jobs.stop("sync:user-data");
    }
}
```

### `JobRegistry` API

| Method             | Description                                                                   |
| ------------------ | ----------------------------------------------------------------------------- |
| `ensure(id)`       | Starts the job if not already running. No-op if already active.               |
| `start(id)`        | Explicitly starts the job. Throws if already running.                         |
| `stop(id)`         | Signals cancellation and waits for the job to finish.                         |
| `run(id, ...args)` | Triggers a job immediately (bypassing the cron schedule). Returns the result. |
| `cancel(id)`       | Sets `context.isCanceled = true`. Does not wait.                              |
| `getStatus(id)`    | Returns the current status of a job.                                          |
| `list()`           | Returns all registered jobs with their status.                                |

---

## Triggering Jobs Manually

You can expose a command that triggers a job on demand:

```ts
@Injectable()
export class AdminService {
    private readonly jobs = inject(JobRegistry);

    @command()
    async triggerFullSync(): Promise<void> {
        await this.jobs.run("sync:full");
    }

    @query()
    async getJobStatuses() {
        return this.jobs.list();
    }
}
```

---

## Examples

### Periodic Data Sync

```ts
@Injectable()
export class DataSyncService {
    private readonly http = inject(HttpService);
    private readonly state = inject(AppState);

    @job({ id: "sync:hourly", cron: "0 * * * *" })
    async hourlySyncJob(context: JobContext): Promise<void> {
        try {
            const since = this.state.getLastSyncTime();
            const changes = await this.http.get(`/api/sync?since=${since.toISOString()}`);

            for (const change of changes) {
                if (context.isCanceled) return;
                this.state.applyChange(change);
                context.progress = /* ... */ 0;
            }

            this.state.setLastSyncTime(new Date());
        } catch (err) {
            // Log and return — job will retry at the next cron tick
            console.error("[DataSync] Hourly sync failed:", err);
        }
    }
}
```

### Nightly Cache Cleanup

```ts
@Injectable()
export class CacheService {
    @job({ id: "cleanup:cache", cron: "0 3 * * *" })
    async cleanupStaleCache(context: JobContext): Promise<void> {
        const entries = await this.getStaleEntries();

        for (const entry of entries) {
            if (context.isCanceled) break;
            await this.deleteEntry(entry.key);
        }
    }
}
```

### Health Check

```ts
@Injectable()
export class HealthService {
    @job({ id: "health:check", cron: "*/5 * * * *" })
    async checkApiHealth(): Promise<void> {
        try {
            await this.http.get("/api/health");
            this.state.setApiHealthy(true);
        } catch {
            this.state.setApiHealthy(false);
            this.signals.publish("system:api-unreachable", undefined);
        }
    }
}
```

---

## Best Practices

**Always check `context.isCanceled` inside loops.** If you don't, a job that should stop will keep running until it finishes naturally.

**Wrap job bodies in try/catch.** An unhandled throw inside a job will crash that job run. Log the error and return — the cron scheduler will retry at the next tick.

**Start jobs in `onReady()`, stop them in `onShutdown()`.** This ensures jobs align with the module lifecycle and are properly cancelled on shutdown.

**Keep jobs idempotent.** A job may be interrupted and re-run. Design the job body so that running it twice produces the same result as running it once.

**Report progress for long-running jobs.** Setting `context.progress` allows monitoring tools to display meaningful status.
