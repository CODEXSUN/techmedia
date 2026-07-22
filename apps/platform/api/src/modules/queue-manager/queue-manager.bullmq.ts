import { Queue, Worker, type JobsOptions } from "bullmq";
import { env } from "../../env.js";
import type { QueueJobRecord } from "./queue-manager.types.js";

const queues = new Map<string, Queue>();
const workers = new Map<string, Worker>();

export function bullMqAvailable() {
  return env.TECHMEDIA_QUEUE_BACKEND === "bullmq-redis";
}

export async function publishBullMqJob(job: QueueJobRecord) {
  if (!bullMqAvailable()) return;
  const queue = queueFor(job.queueName);
  const options: JobsOptions = {
    attempts: job.maxAttempts,
    backoff: { delay: 5000, type: "exponential" },
    jobId: job.idempotencyKey ?? job.uuid,
    priority: job.priority,
    removeOnComplete: false,
    removeOnFail: false
  };
  await queue.add(job.jobName, { queueJobId: job.id, ...job.payload }, options);
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
  workers.set(queueName, worker);
  return worker;
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
