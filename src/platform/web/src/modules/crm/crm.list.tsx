import { format } from "date-fns";
import {
  Ban,
  CircleCheck,
  CircleDot,
  CircleX,
  RefreshCw,
  Trash2,
  TriangleAlert
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@codexsun/ui";
import { WorkspaceRowActions } from "@codexsun/ui/workspace/row-actions";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import {
  WorkspaceTableEmptyState,
  WorkspaceTableHeaderCell,
  WorkspaceTableLoadingState,
  WorkspaceTablePanel
} from "@codexsun/ui/workspace/table";
import type { CrmEnquiry, CrmEnquiryColumnVisibility, CrmEnquiryPriority } from "./crm.types";

export function CrmList({
  error,
  loading,
  onForceDelete,
  onRestore,
  onSelect,
  onSuspend,
  onView,
  records,
  visibleColumns
}: {
  error: boolean;
  loading: boolean;
  onForceDelete?: (record: CrmEnquiry) => void;
  onRestore?: (record: CrmEnquiry) => void;
  onSelect?: (record: CrmEnquiry) => void;
  onSuspend?: (record: CrmEnquiry) => void;
  onView: (record: CrmEnquiry) => void;
  records: CrmEnquiry[];
  visibleColumns: CrmEnquiryColumnVisibility;
}) {
  return (
    <TooltipProvider>
      <WorkspaceTablePanel>
        <div className="overflow-x-auto [scrollbar-color:hsl(var(--muted-foreground)/0.35)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-0.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/35 [&::-webkit-scrollbar-track]:bg-transparent">
          <table className="w-full table-fixed border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr>
                {visibleColumns.id ? (
                  <WorkspaceTableHeaderCell className="w-[72px] min-w-[72px] max-w-[72px]">
                    ID
                  </WorkspaceTableHeaderCell>
                ) : null}
                {visibleColumns.mobile ? (
                  <WorkspaceTableHeaderCell>Mobile</WorkspaceTableHeaderCell>
                ) : null}
                {visibleColumns.customer ? (
                  <WorkspaceTableHeaderCell>Customer</WorkspaceTableHeaderCell>
                ) : null}
                {visibleColumns.title ? (
                  <WorkspaceTableHeaderCell>Enquiry details</WorkspaceTableHeaderCell>
                ) : null}
                {visibleColumns.enquiryGroup ? (
                  <WorkspaceTableHeaderCell>List in</WorkspaceTableHeaderCell>
                ) : null}
                {visibleColumns.dueDate ? (
                  <WorkspaceTableHeaderCell>Due date</WorkspaceTableHeaderCell>
                ) : null}
                {visibleColumns.priority ? (
                  <WorkspaceTableHeaderCell
                    aria-label="Priority"
                    className="w-12 min-w-12 max-w-12 p-0 text-center"
                  >
                    <span className="sr-only">Priority</span>
                  </WorkspaceTableHeaderCell>
                ) : null}
                {visibleColumns.createdBy ? (
                  <WorkspaceTableHeaderCell>User</WorkspaceTableHeaderCell>
                ) : null}
                {visibleColumns.assignedTo ? (
                  <WorkspaceTableHeaderCell>Assigned to</WorkspaceTableHeaderCell>
                ) : null}
                {visibleColumns.status ? (
                  <WorkspaceTableHeaderCell className="w-24 min-w-24 max-w-24">
                    Status
                  </WorkspaceTableHeaderCell>
                ) : null}
                <WorkspaceTableHeaderCell className="w-16 min-w-16 max-w-16 text-right">
                  Action
                </WorkspaceTableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr className="border-b border-border/70 last:border-b-0" key={record.id}>
                  {visibleColumns.id ? (
                    <td className="w-[72px] min-w-[72px] max-w-[72px] truncate px-4 py-2.5 font-mono text-xs tabular-nums">
                      {onSelect && record.lifecycleStatus === "active" ? (
                        <button
                          className="cursor-pointer font-medium hover:underline"
                          onClick={() => onSelect(record)}
                          type="button"
                        >
                          #{record.id}
                        </button>
                      ) : (
                        <>#{record.id}</>
                      )}
                    </td>
                  ) : null}
                  {visibleColumns.mobile ? (
                    <td className="truncate whitespace-nowrap px-4 py-2.5">
                      {record.mobile ? (
                        <button
                          className="cursor-pointer font-medium hover:underline"
                          onClick={() => onView(record)}
                          type="button"
                        >
                          {record.mobile}
                        </button>
                      ) : (
                        record.mobile || "—"
                      )}
                    </td>
                  ) : null}
                  {visibleColumns.customer ? (
                    <td className="max-w-52 truncate px-4 py-2.5" title={record.customer}>
                      {record.customer ? (
                        <button
                          className="max-w-48 cursor-pointer truncate text-left font-medium hover:underline"
                          onClick={() => onView(record)}
                          type="button"
                        >
                          {record.customer}
                        </button>
                      ) : (
                        record.customer || "—"
                      )}
                    </td>
                  ) : null}
                  {visibleColumns.title ? (
                    <td className="max-w-80 px-4 py-2.5">
                      <button
                        className="line-clamp-2 cursor-pointer text-left font-medium hover:underline"
                        onClick={() => onView(record)}
                        type="button"
                      >
                        {plainText(record.workspace) || plainText(record.title)}
                      </button>
                    </td>
                  ) : null}
                  {visibleColumns.enquiryGroup ? (
                    <td className="truncate whitespace-nowrap px-4 py-2.5">
                      {record.enquiryGroup || "—"}
                    </td>
                  ) : null}
                  {visibleColumns.dueDate ? (
                    <td className="truncate whitespace-nowrap px-4 py-2.5">
                      {record.schedules[0]?.scheduledOn
                        ? format(
                            new Date(`${record.schedules[0].scheduledOn}T00:00:00`),
                            "dd MMM yyyy"
                          )
                        : "—"}
                    </td>
                  ) : null}
                  {visibleColumns.priority ? (
                    <td className="w-12 min-w-12 max-w-12 p-0 text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            aria-label={`Priority: ${statusLabel(record.priority)}`}
                            className={`inline-flex size-3 rounded-full ring-1 ring-inset ${priorityCircleClassName(record.priority)}`}
                            role="img"
                            tabIndex={0}
                          >
                            <span className="sr-only">{statusLabel(record.priority)}</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{statusLabel(record.priority)} priority</TooltipContent>
                      </Tooltip>
                    </td>
                  ) : null}
                  {visibleColumns.createdBy ? (
                    <td className="truncate px-4 py-2.5">{record.createdBy.name}</td>
                  ) : null}
                  {visibleColumns.assignedTo ? (
                    <td className="truncate px-4 py-2.5">
                      {record.assignedTo?.name ?? "Unassigned"}
                    </td>
                  ) : null}
                  {visibleColumns.status ? (
                    <td className="w-24 min-w-24 max-w-24 px-4 py-2.5">
                      <EnquiryStatusBadge record={record} />
                    </td>
                  ) : null}
                  <td className="w-16 min-w-16 max-w-16 px-2 py-1.5 text-right">
                    <div
                      className="flex justify-end"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <WorkspaceRowActions
                        {...(onForceDelete
                          ? {
                              actions: [
                                {
                                  id: "force-delete",
                                  icon: <Trash2 className="size-4" />,
                                  label: "Force delete",
                                  onSelect: () => onForceDelete(record),
                                  tone: "destructive" as const
                                }
                              ]
                            }
                          : {})}
                        deleteLabel="Suspend"
                        isSuspended={record.lifecycleStatus === "suspended"}
                        {...(onSelect && record.lifecycleStatus === "active"
                          ? { onEdit: () => onSelect(record) }
                          : {})}
                        {...(onRestore ? { onRestore: () => onRestore(record) } : {})}
                        {...(onSuspend ? { onDelete: () => onSuspend(record) } : {})}
                        onView={() => onView(record)}
                        restoreLabel="Restore"
                        title={`Enquiry #${record.id}`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {records.length === 0 ? (
          loading ? (
            <WorkspaceTableLoadingState />
          ) : (
            <WorkspaceTableEmptyState>
              {error
                ? "Enquiries could not be loaded. Use Refresh to try again."
                : "No enquiries found."}
            </WorkspaceTableEmptyState>
          )
        ) : null}
      </WorkspaceTablePanel>
    </TooltipProvider>
  );
}

function statusLabel(status: CrmEnquiry["status"] | CrmEnquiryPriority) {
  return status[0]!.toUpperCase() + status.slice(1);
}

function plainText(value: string) {
  return value
    .replace(/<br\s*\/?\s*>/giu, " ")
    .replace(/<\/p\s*>/giu, " ")
    .replace(/<[^>]*>/gu, "")
    .replace(/&nbsp;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/\s+/gu, " ")
    .trim();
}

function statusTone(status: CrmEnquiry["status"]): "danger" | "info" | "success" | "warning" {
  if (status === "won") return "success";
  if (status === "lost") return "danger";
  if (status === "escalation") return "warning";
  return status === "open" ? "info" : "danger";
}

function statusClassName(status: CrmEnquiry["status"]) {
  return status === "follow"
    ? "rounded-full border-pink-200 bg-pink-50 pl-6 text-pink-700"
    : "rounded-full pl-6";
}

function EnquiryStatusBadge({ record }: { record: CrmEnquiry }) {
  const suspended = record.lifecycleStatus === "suspended";
  return (
    <span className="relative inline-flex">
      <span
        className={`pointer-events-none absolute left-2 top-1/2 z-10 -translate-y-1/2 ${statusIconClassName(record.status, suspended)}`}
      >
        {suspended ? <Ban className="size-3" /> : statusIcon(record.status)}
      </span>
      <WorkspaceStatusBadge
        className={suspended ? "rounded-full pl-6" : statusClassName(record.status)}
        label={suspended ? "Suspended" : statusLabel(record.status)}
        showIcon={false}
        tone={suspended ? "danger" : statusTone(record.status)}
      />
    </span>
  );
}

function statusIcon(status: CrmEnquiry["status"]) {
  if (status === "follow") return <RefreshCw className="size-3" />;
  if (status === "escalation") return <TriangleAlert className="size-3" />;
  if (status === "won") return <CircleCheck className="size-3" />;
  if (status === "lost") return <CircleX className="size-3" />;
  return <CircleDot className="size-3" />;
}

function statusIconClassName(status: CrmEnquiry["status"], suspended: boolean) {
  if (suspended || status === "lost") return "text-red-700";
  if (status === "follow") return "text-pink-700";
  if (status === "escalation") return "text-amber-700";
  if (status === "won") return "text-emerald-700";
  return "text-blue-700";
}

function priorityCircleClassName(priority: CrmEnquiryPriority) {
  if (priority === "low") return "bg-sky-500 ring-sky-600/30";
  if (priority === "normal") return "bg-teal-500 ring-teal-600/30";
  if (priority === "high") return "bg-amber-500 ring-amber-600/30";
  return "bg-red-500 ring-red-600/30";
}
