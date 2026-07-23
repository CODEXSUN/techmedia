import { EraserIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@codexsun/ui/components/button";
import { WorkspaceSelect } from "@codexsun/ui/workspace/select";
import { WorkspaceSwitchCard } from "@codexsun/ui/workspace/status";
import type { QueueJobFilters, QueueRuntimeSettings } from "./queue-management.types";

export function QueueManagementForm({
  filters,
  loading,
  onBackendChange,
  onCleanup,
  onFiltersChange,
  onRefresh,
  settings
}: {
  filters: QueueJobFilters;
  loading: boolean;
  onBackendChange: (backend: QueueRuntimeSettings["backend"]) => void;
  onCleanup: () => void;
  onFiltersChange: (filters: QueueJobFilters) => void;
  onRefresh: () => void;
  settings: QueueRuntimeSettings | undefined;
}) {
  return (
    <div className="grid gap-3">
      <WorkspaceSwitchCard
        activeLabel="BullMQ + Redis"
        ariaLabel="Use BullMQ and Redis queue backend"
        checked={settings?.backend === "bullmq-redis"}
        description={
          settings?.backend === "bullmq-redis"
            ? `Redis-backed workers are active. ${settings.backendHealth.latencyMs} ms health latency.`
            : "Database queue is active and requires no local Redis installation."
        }
        disabled={loading}
        fieldLabel="Queue backend"
        inactiveLabel="Database queue"
        onCheckedChange={(checked) => onBackendChange(checked ? "bullmq-redis" : "database")}
      />
      <div className="flex flex-wrap justify-end gap-2">
        <div className="w-40">
          <WorkspaceSelect
            value={filters.status || "all"}
            options={[
              { label: "All status", value: "all" },
              { label: "Pending", value: "pending" },
              { label: "Running", value: "running" },
              { label: "Failed", value: "failed" },
              { label: "Completed", value: "completed" },
              { label: "Cancelled", value: "cancelled" }
            ]}
            onValueChange={(status) =>
              onFiltersChange({
                ...filters,
                status: status === "all" ? "" : (status as QueueJobFilters["status"])
              })
            }
          />
        </div>
        <input
          className="w-36 rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Queue"
          value={filters.queueName}
          onChange={(event) => onFiltersChange({ ...filters, queueName: event.target.value })}
        />
        <input
          className="w-40 rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Tenant"
          value={filters.tenantId}
          onChange={(event) => onFiltersChange({ ...filters, tenantId: event.target.value })}
        />
        <input
          className="w-56 rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Correlation ID"
          value={filters.correlationId}
          onChange={(event) => onFiltersChange({ ...filters, correlationId: event.target.value })}
        />
        <Button disabled={loading} variant="outline" onClick={onCleanup}>
          <EraserIcon className="size-4" />
          Clean
        </Button>
        <Button disabled={loading} variant="outline" onClick={onRefresh}>
          <RefreshCwIcon className="size-4" />
          Refresh
        </Button>
      </div>
    </div>
  );
}
