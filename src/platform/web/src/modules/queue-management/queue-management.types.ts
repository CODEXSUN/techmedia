export type QueueJobStatus = "cancelled" | "completed" | "failed" | "pending" | "running";

export type QueueJobRecord = {
  actorEmail: string | null;
  attempts: number;
  availableAt: string;
  completedAt: string | null;
  correlationId: string | null;
  createdAt: string;
  errorMessage: string | null;
  id: number;
  idempotencyKey: string | null;
  jobName: string;
  maxAttempts: number;
  payload: Record<string, unknown>;
  priority: number;
  queueName: string;
  result: Record<string, unknown>;
  sourceModule: string;
  startedAt: string | null;
  status: QueueJobStatus;
  tenantId: string | null;
  updatedAt: string;
  uuid: string;
};

export type QueueRuntimeSettings = {
  backend: "database" | "bullmq-redis";
  backendHealth: {
    checkedAt: string;
    latencyMs: number;
    message?: string;
    status: "available" | "degraded" | "unavailable";
  };
  backendLabel: string;
  canRunInline: boolean;
  completed: number;
  failed: number;
  pending: number;
  redisConfigured: boolean;
  running: number;
  workerEnabled: boolean;
  workerIntervalMs: number;
};

export type QueueJobFilters = {
  correlationId: string;
  queueName: string;
  status: "" | QueueJobStatus;
  tenantId: string;
};

export type QueueCleanupResult = {
  completedDeleted: number;
  failedDeleted: number;
};
