import { useState } from "react";
import { toast } from "@codexsun/ui/components/sonner";
import { WorkspacePage } from "@codexsun/ui/workspace/page";
import { QueueManagementForm } from "./queue-management.form";
import {
  useQueueJobMutations,
  useQueueJobsQuery,
  useQueueRuntimeQuery
} from "./queue-management.hooks";
import { QueueManagementList } from "./queue-management.list";
import type { QueueJobFilters } from "./queue-management.types";

export function QueueManagementWorkspace() {
  const [filters, setFilters] = useState<QueueJobFilters>({
    correlationId: "",
    queueName: "",
    status: "",
    tenantId: ""
  });
  const jobs = useQueueJobsQuery(filters);
  const settings = useQueueRuntimeQuery();
  const mutations = useQueueJobMutations();
  const busy =
    mutations.backend.isPending ||
    mutations.cancel.isPending ||
    mutations.cleanup.isPending ||
    mutations.retry.isPending ||
    mutations.run.isPending;
  return (
    <WorkspacePage
      title="Queue Management"
      description="Run jobs locally with the database queue or switch live workloads to BullMQ and Redis."
      technicalName="page.queue-management"
    >
      <div className="rounded-md border bg-card p-3 shadow-sm">
        <QueueManagementForm
          filters={filters}
          loading={jobs.isLoading || settings.isLoading || busy}
          settings={settings.data}
          onBackendChange={(backend) => {
            const label = backend === "bullmq-redis" ? "BullMQ + Redis" : "database queue";
            if (
              !window.confirm(
                `Switch the active queue backend to ${label}? Pending jobs will remain durable.`
              )
            ) {
              return;
            }
            mutations.backend.mutate(backend, {
              onError: (error) =>
                toast.error("Queue backend was not changed", {
                  description: error instanceof Error ? error.message : "Please try again."
                }),
              onSuccess: () => toast.success(`Queue backend changed to ${label}`)
            });
          }}
          onCleanup={() => mutations.cleanup.mutate()}
          onFiltersChange={setFilters}
          onRefresh={() => {
            void jobs.refetch();
            void settings.refetch();
          }}
        />
      </div>
      <QueueManagementList
        busy={busy}
        jobs={jobs.data ?? []}
        settings={settings.data}
        onCancel={(id) => mutations.cancel.mutate(id)}
        onRetry={(id) => mutations.retry.mutate(id)}
        onRun={(id) => mutations.run.mutate(id)}
      />
    </WorkspacePage>
  );
}
