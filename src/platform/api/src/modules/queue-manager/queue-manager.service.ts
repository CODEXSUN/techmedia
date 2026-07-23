import { PlatformActivityService } from "../platform-activity/index.js";
import { processDatabaseMaintenanceJob } from "../database-maintenance/database-maintenance.worker.js";
import { QueueManagerRepository } from "./queue-manager.repository.js";
import { env } from "../../env.js";
import {
  cancelBullMqJob,
  checkBullMqHealth,
  closeBullMq,
  publishBullMqJob,
  retryBullMqJob
} from "./queue-manager.bullmq.js";
import type { QueueBackend, QueueJobFilters, QueueJobPayload } from "./queue-manager.types.js";

export class QueueManagerService {
  constructor(
    private readonly repository = new QueueManagerRepository(),
    private readonly activity = new PlatformActivityService()
  ) {}

  listJobs(filters: QueueJobFilters = {}) {
    return this.repository.list(filters);
  }

  findJob(id: number) {
    return this.repository.find(id);
  }

  async runtimeSettings() {
    const settings = await this.repository.settings();
    if (settings.backend === "bullmq-redis") {
      settings.backendHealth = await checkBullMqHealth();
    }
    return settings;
  }

  async enqueue(input: QueueJobPayload) {
    const job = await this.repository.enqueue(input);
    if (job && (await this.repository.configuredBackend()) === "bullmq-redis") {
      await publishBullMqJob(job);
    }
    return job;
  }

  async switchBackend(backend: QueueBackend) {
    const current = await this.repository.configuredBackend();
    if (backend === current) return this.runtimeSettings();
    if (backend === "bullmq-redis") {
      const health = await checkBullMqHealth();
      if (health.status !== "available") {
        throw new Error(health.message || "Redis is unavailable.");
      }
      for (const job of await this.repository.pendingJobs()) {
        await publishBullMqJob(job);
      }
    } else {
      await closeBullMq();
    }
    await this.repository.setBackend(backend);
    await this.activity.recordActivity({
      action: "queue.backend.changed",
      details: { from: current, to: backend },
      moduleKey: "platform.queue-manager",
      recordLabel: "Queue backend"
    });
    return this.runtimeSettings();
  }

  async runJob(id: number, options: { fromWorker?: boolean } = {}) {
    const job = await this.repository.find(id);
    if (!job) return null;
    const backend = await this.repository.configuredBackend();
    if (backend === "bullmq-redis" && job.status === "pending" && !options.fromWorker) {
      await publishBullMqJob(job);
      return job;
    }
    if (job.status !== "pending" && job.status !== "failed") {
      return job;
    }

    await this.repository.markRunning(id);
    try {
      const result = await this.dispatch(job.jobName, job.payload);
      const completed = await this.repository.markCompleted(id, result);
      await this.activity.recordActivity({
        action: "queue.job.completed",
        details: { jobName: job.jobName, queueName: job.queueName },
        moduleKey: "platform.queue-manager",
        recordId: job.id,
        recordLabel: job.jobName,
        recordUuid: job.uuid
      });
      return completed;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Queue job failed.";
      const failed = await this.repository.markFailed(id, message);
      await this.activity.recordActivity({
        action: "queue.job.failed",
        details: { error: message, jobName: job.jobName, queueName: job.queueName },
        moduleKey: "platform.queue-manager",
        recordId: job.id,
        recordLabel: job.jobName,
        recordUuid: job.uuid
      });
      if (options.fromWorker) throw error;
      if (job.attempts + 1 < job.maxAttempts) {
        return this.repository.retryAfter(id, 5000 * 2 ** job.attempts);
      }
      return failed;
    }
  }

  async runNextJob() {
    const job = await this.repository.nextRunnable();
    return job ? this.runJob(job.id) : null;
  }

  async retryJob(id: number) {
    const job = await this.repository.retry(id);
    if (!job) return null;
    if ((await this.repository.configuredBackend()) === "bullmq-redis") {
      await retryBullMqJob(job);
    }
    await this.activity.recordActivity({
      action: "queue.job.retried",
      moduleKey: "platform.queue-manager",
      recordId: job.id,
      recordLabel: job.jobName,
      recordUuid: job.uuid
    });
    return job;
  }

  async cancelJob(id: number) {
    const current = await this.repository.find(id);
    if (current && (await this.repository.configuredBackend()) === "bullmq-redis") {
      await cancelBullMqJob(current);
    }
    const job = await this.repository.cancel(id);
    if (!job) return null;
    await this.activity.recordActivity({
      action: "queue.job.cancelled",
      moduleKey: "platform.queue-manager",
      recordId: job.id,
      recordLabel: job.jobName,
      recordUuid: job.uuid
    });
    return job;
  }

  async cleanupRetainedJobs() {
    const completedBefore = new Date(
      Date.now() - env.TECHMEDIA_QUEUE_COMPLETED_RETENTION_DAYS * 24 * 60 * 60 * 1000
    );
    const failedBefore = new Date(
      Date.now() - env.TECHMEDIA_QUEUE_FAILED_RETENTION_DAYS * 24 * 60 * 60 * 1000
    );
    return this.repository.cleanup({ completedBefore, failedBefore });
  }

  private dispatch(jobName: string, payload: Record<string, unknown>) {
    if (jobName === "database-maintenance.run") {
      return processDatabaseMaintenanceJob(payload);
    }
    throw new Error(`No queue worker registered for ${jobName}.`);
  }
}
