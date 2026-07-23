import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { WorkspaceRowActions } from "@codexsun/ui/workspace/row-actions";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import {
  WorkspaceTableEmptyState,
  WorkspaceTableHeaderCell,
  WorkspaceTablePanel
} from "@codexsun/ui/workspace/table";
import type { CrmEnquiry } from "./crm.types";

export function CrmList({
  onForceDelete,
  onRestore,
  onSelect,
  onSuspend,
  onView,
  records
}: {
  onForceDelete?: (record: CrmEnquiry) => void;
  onRestore?: (record: CrmEnquiry) => void;
  onSelect?: (record: CrmEnquiry) => void;
  onSuspend?: (record: CrmEnquiry) => void;
  onView: (record: CrmEnquiry) => void;
  records: CrmEnquiry[];
}) {
  return (
    <WorkspaceTablePanel>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1450px] border-collapse text-sm">
          <thead className="bg-muted/50">
            <tr>
              <WorkspaceTableHeaderCell>Enquiry ID</WorkspaceTableHeaderCell>
              <WorkspaceTableHeaderCell>Mobile</WorkspaceTableHeaderCell>
              <WorkspaceTableHeaderCell>Customer</WorkspaceTableHeaderCell>
              <WorkspaceTableHeaderCell>Enquiry details</WorkspaceTableHeaderCell>
              <WorkspaceTableHeaderCell>List in</WorkspaceTableHeaderCell>
              <WorkspaceTableHeaderCell>Date</WorkspaceTableHeaderCell>
              <WorkspaceTableHeaderCell>User</WorkspaceTableHeaderCell>
              <WorkspaceTableHeaderCell>Assigned to</WorkspaceTableHeaderCell>
              <WorkspaceTableHeaderCell>Status</WorkspaceTableHeaderCell>
              <WorkspaceTableHeaderCell className="text-right">Action</WorkspaceTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr className="border-b border-border/70 last:border-b-0" key={record.id}>
                <td className="px-4 py-2.5 font-mono text-xs">#{record.id}</td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  {onSelect && record.lifecycleStatus === "active" && record.mobile ? (
                    <button
                      className="cursor-pointer font-medium hover:underline"
                      onClick={() => onSelect(record)}
                      type="button"
                    >
                      {record.mobile}
                    </button>
                  ) : (
                    record.mobile || "—"
                  )}
                </td>
                <td className="max-w-52 truncate px-4 py-2.5" title={record.customer}>
                  {onSelect && record.lifecycleStatus === "active" && record.customer ? (
                    <button
                      className="max-w-48 cursor-pointer truncate text-left font-medium hover:underline"
                      onClick={() => onSelect(record)}
                      type="button"
                    >
                      {record.customer}
                    </button>
                  ) : (
                    record.customer || "—"
                  )}
                </td>
                <td className="max-w-80 px-4 py-2.5">
                  {onSelect && record.lifecycleStatus === "active" ? (
                    <button
                      className="line-clamp-2 cursor-pointer text-left font-medium hover:underline"
                      onClick={() => onSelect(record)}
                      type="button"
                    >
                      {record.title}
                    </button>
                  ) : (
                    <span className="line-clamp-2 font-medium">{record.title}</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5">{record.enquiryGroup || "—"}</td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  {record.enquiryDate
                    ? format(new Date(`${record.enquiryDate}T00:00:00`), "dd MMM yyyy")
                    : "—"}
                </td>
                <td className="px-4 py-2.5">{record.createdBy.name}</td>
                <td className="px-4 py-2.5">{record.assignedTo?.name ?? "Unassigned"}</td>
                <td className="px-4 py-2.5">
                  <WorkspaceStatusBadge
                    label={
                      record.lifecycleStatus === "suspended"
                        ? "Suspended"
                        : statusLabel(record.status)
                    }
                    tone={
                      record.lifecycleStatus === "suspended" ? "danger" : statusTone(record.status)
                    }
                  />
                </td>
                <td className="px-4 py-1.5 text-right">
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

function statusTone(status: CrmEnquiry["status"]): "danger" | "neutral" | "success" | "warning" {
  if (status === "won") return "success";
  if (status === "lost") return "neutral";
  if (status === "escalation") return "danger";
  return status === "follow" ? "warning" : "success";
}
