import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { WorkspaceRowActions } from "@codexsun/ui/workspace/row-actions";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import {
  WorkspaceTableEmptyState,
  WorkspaceTableHeaderCell,
  WorkspaceTablePanel
} from "@codexsun/ui/workspace/table";
import type { CrmEnquiry, CrmEnquiryColumnVisibility } from "./crm.types";

export function CrmList({
  onForceDelete,
  onRestore,
  onSelect,
  onSuspend,
  onView,
  records,
  visibleColumns
}: {
  onForceDelete?: (record: CrmEnquiry) => void;
  onRestore?: (record: CrmEnquiry) => void;
  onSelect?: (record: CrmEnquiry) => void;
  onSuspend?: (record: CrmEnquiry) => void;
  onView: (record: CrmEnquiry) => void;
  records: CrmEnquiry[];
  visibleColumns: CrmEnquiryColumnVisibility;
}) {
  return (
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
              {visibleColumns.createdBy ? (
                <WorkspaceTableHeaderCell>User</WorkspaceTableHeaderCell>
              ) : null}
              {visibleColumns.assignedTo ? (
                <WorkspaceTableHeaderCell>Assigned to</WorkspaceTableHeaderCell>
              ) : null}
              {visibleColumns.status ? (
                <WorkspaceTableHeaderCell className="w-28 min-w-28 max-w-28">
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
                      {plainText(record.subject) || plainText(record.title)}
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
                {visibleColumns.createdBy ? (
                  <td className="truncate px-4 py-2.5">{record.createdBy.name}</td>
                ) : null}
                {visibleColumns.assignedTo ? (
                  <td className="truncate px-4 py-2.5">
                    {record.assignedTo?.name ?? "Unassigned"}
                  </td>
                ) : null}
                {visibleColumns.status ? (
                  <td className="w-28 min-w-28 max-w-28 px-4 py-2.5">
                    <WorkspaceStatusBadge
                      label={
                        record.lifecycleStatus === "suspended"
                          ? "Suspended"
                          : statusLabel(record.status)
                      }
                      tone={
                        record.lifecycleStatus === "suspended"
                          ? "danger"
                          : statusTone(record.status)
                      }
                    />
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
        <WorkspaceTableEmptyState>No enquiries found.</WorkspaceTableEmptyState>
      ) : null}
    </WorkspaceTablePanel>
  );
}

function statusLabel(status: CrmEnquiry["status"]) {
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

function statusTone(status: CrmEnquiry["status"]): "danger" | "neutral" | "success" | "warning" {
  if (status === "won") return "success";
  if (status === "lost") return "neutral";
  if (status === "escalation") return "danger";
  return status === "follow" ? "warning" : "success";
}
