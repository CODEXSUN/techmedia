import type { FastifyInstance } from "fastify";
import { env } from "../../env.js";
import { closeBullMq, startBullMqWorker } from "./queue-manager.bullmq.js";
import { QueueManagerService } from "./queue-manager.service.js";

let queueWorkerTimer: NodeJS.Timeout | null = null;
let activeBackend: "bullmq-redis" | "database" | null = null;

export function startQueueManagerWorker(app: FastifyInstance, service = new QueueManagerService()) {
  if (env.TECHMEDIA_QUEUE_WORKER_ENABLED !== "1" || queueWorkerTimer) {
    return;
  }
  let running = false;
  let cleanupTicks = 0;
  queueWorkerTimer = setInterval(() => {
    if (running) return;
    running = true;
    void service
      .runtimeSettings()
      .then(async (settings) => {
        if (settings.backend !== activeBackend) {
          if (activeBackend === "bullmq-redis") await closeBullMq();
          activeBackend = settings.backend;
          if (activeBackend === "bullmq-redis") {
            startBullMqWorker("maintenance", (queueJobId) =>
              service.runJob(queueJobId, { fromWorker: true })
            );
          }
        }
        return settings.backend === "database" ? service.runNextJob() : null;
      })
      .then(async () => {
        cleanupTicks += 1;
        if (cleanupTicks >= 120) {
          cleanupTicks = 0;
          await service.cleanupRetainedJobs();
        }
      })
      .catch((error) => app.log.error({ error }, "queue worker failed"))
      .finally(() => {
        running = false;
      });
  }, env.TECHMEDIA_QUEUE_WORKER_INTERVAL_MS);
  queueWorkerTimer.unref();
  app.addHook("onClose", async () => {
    if (queueWorkerTimer) {
      clearInterval(queueWorkerTimer);
      queueWorkerTimer = null;
    }
    activeBackend = null;
    await closeBullMq();
  });
}
