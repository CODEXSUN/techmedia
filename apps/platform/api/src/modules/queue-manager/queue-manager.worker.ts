import type { QueueJobRecord } from "./queue-manager.types.js";

export const queueManagerWorker = {
  backend: "database",
  jobs: ["database-maintenance.run"],
  queue: "maintenance"
} as const;

export function queueJobCanRunInline(job: QueueJobRecord) {
  return job.status === "pending" || job.status === "failed";
}

export async function processQueueManagerJob(
  job: QueueJobRecord,
  run: (id: number) => Promise<unknown>
) {
  if (!queueJobCanRunInline(job)) {
    return { processed: false, reason: "job-not-runnable", status: job.status };
  }
  await run(job.id);
  return { jobId: job.id, processed: true };
}
