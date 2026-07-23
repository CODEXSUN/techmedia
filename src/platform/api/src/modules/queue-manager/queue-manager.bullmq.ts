import { Queue, Worker, type JobsOptions } from "bullmq";
import { env } from "../../env.js";
import type { QueueJobRecord } from "./queue-manager.types.js";

const queues = new Map<string, Queue>();
const workers = new Map<string, Worker>();

export function bullMqAvailable() {
  return Boolean(env.TECHMEDIA_REDIS_URL.trim());
}

export async function publishBullMqJob(job: QueueJobRecord) {
  if (!bullMqAvailable()) throw new Error("Redis URL is not configured.");
  const queue = queueFor(job.queueName);
  const jobId = job.idempotencyKey ?? job.uuid;
  const existing = await queue.getJob(jobId);
  if (existing) {
    return { deduplicated: true, jobId: String(existing.id) };
  }
  const options: JobsOptions = {
    attempts: job.maxAttempts,
    backoff: { delay: 5000, type: "exponential" },
    jobId,
    priority: job.priority,
    removeOnComplete: false,
    removeOnFail: false
  };
  const queued = await queue.add(job.jobName, { queueJobId: job.id, ...job.payload }, options);
  return { deduplicated: false, jobId: String(queued.id) };
}

export function startBullMqWorker(
  queueName: string,
  run: (queueJobId: number) => Promise<unknown>
) {
  if (!bullMqAvailable() || workers.has(queueName)) return null;
  const worker = new Worker(
    queueName,
    async (job) => {
      const queueJobId = Number(job.data?.queueJobId);
      if (!Number.isInteger(queueJobId) || queueJobId <= 0) {
        throw new Error("BullMQ job is missing queueJobId.");
      }
      return run(queueJobId);
    },
    { connection: redisConnectionOptions() }
  );
  worker.on("error", (error) => {
    console.error(`[queue.redis] worker error queue=${queueName}: ${error.message}`);
  });
  workers.set(queueName, worker);
  return worker;
}

export async function checkBullMqHealth(timeoutMs = 3000) {
  const startedAt = Date.now();
  if (!bullMqAvailable()) {
    return {
      checkedAt: new Date().toISOString(),
      latencyMs: 0,
      message: "Redis URL is not configured.",
      status: "unavailable" as const
    };
  }
  try {
    const queue = queueFor("techmedia-system-health");
    await Promise.race([
      queue.getJobCounts("waiting", "active", "failed"),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Redis health check timed out.")), timeoutMs)
      )
    ]);
    return {
      checkedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
      status: "available" as const
    };
  } catch (error) {
    return {
      checkedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : "Redis is unavailable.",
      status: "unavailable" as const
    };
  }
}

export async function cancelBullMqJob(job: QueueJobRecord) {
  const queued = await queueFor(job.queueName).getJob(job.idempotencyKey ?? job.uuid);
  if (!queued) return false;
  await queued.remove();
  return true;
}

export async function retryBullMqJob(job: QueueJobRecord) {
  const queue = queueFor(job.queueName);
  const queued = await queue.getJob(job.idempotencyKey ?? job.uuid);
  if (!queued) {
    await publishBullMqJob(job);
    return true;
  }
  const state = await queued.getState();
  if (state === "failed") {
    await queued.retry();
    return true;
  }
  if (state === "completed") {
    await queued.remove();
    await publishBullMqJob(job);
    return true;
  }
  return state === "waiting" || state === "delayed" || state === "active";
}

export async function closeBullMq() {
  for (const worker of workers.values()) await worker.close();
  for (const queue of queues.values()) await queue.close();
  workers.clear();
  queues.clear();
}

function queueFor(queueName: string) {
  const existing = queues.get(queueName);
  if (existing) return existing;
  const queue = new Queue(queueName, { connection: redisConnectionOptions() });
  queue.on("error", (error) => {
    console.error(`[queue.redis] connection error queue=${queueName}: ${error.message}`);
  });
  queues.set(queueName, queue);
  return queue;
}

function redisConnectionOptions() {
  const url = new URL(env.TECHMEDIA_REDIS_URL);
  return {
    db: url.pathname && url.pathname !== "/" ? Number(url.pathname.slice(1)) : 0,
    host: url.hostname || "127.0.0.1",
    maxRetriesPerRequest: null,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    port: url.port ? Number(url.port) : 6379,
    username: url.username ? decodeURIComponent(url.username) : undefined
  };
}
