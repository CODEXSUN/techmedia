import { EraserIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@codexsun/ui/components/button";
import { WorkspaceSelect } from "@codexsun/ui/workspace/select";
import type { QueueJobFilters } from "./queue-management.types";

export function QueueManagementForm({
  filters,
  loading,
  onCleanup,
  onFiltersChange,
  onRefresh
}: {
  filters: QueueJobFilters;
  loading: boolean;
  onCleanup: () => void;
  onFiltersChange: (filters: QueueJobFilters) => void;
  onRefresh: () => void;
}) {
  return (
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
  );
}
