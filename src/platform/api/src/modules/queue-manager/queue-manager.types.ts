export type QueueBackend = "database" | "bullmq-redis";
export type QueueJobStatus = "cancelled" | "completed" | "failed" | "pending" | "running";

export type QueueJobPayload = {
  actorEmail?: string;
  availableAt?: string;
  correlationId?: string;
  idempotencyKey?: string;
  jobName: string;
  maxAttempts?: number;
  payload: Record<string, unknown>;
  priority?: number;
  queueName: string;
  sourceModule: string;
  tenantId?: string | null;
};

export type QueueJobFilters = {
  correlationId?: string;
  queueName?: string;
  status?: QueueJobStatus;
  tenantId?: string;
};

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
  backend: QueueBackend;
  backendLabel: string;
  backendHealth: {
    checkedAt: string;
    latencyMs: number;
    message?: string;
    status: "available" | "degraded" | "unavailable";
  };
  canRunInline: boolean;
  pending: number;
  running: number;
  failed: number;
  completed: number;
  redisConfigured: boolean;
  workerEnabled: boolean;
  workerIntervalMs: number;
};
