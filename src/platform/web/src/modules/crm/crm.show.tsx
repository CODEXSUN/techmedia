import { Pencil } from "lucide-react";
import { Button } from "@codexsun/ui/components/button";
import { WorkspaceDetailTable, WorkspaceShowCard } from "@codexsun/ui/workspace/show";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import { WorkspaceUpsertDialog } from "@codexsun/ui/workspace/upsert";
import type { CrmEnquiry } from "./crm.types";

export function CrmShow({
  onClose,
  onEdit,
  open,
  record
}: {
  onClose: () => void;
  onEdit?: () => void;
  open: boolean;
  record: CrmEnquiry | null;
}) {
  return (
    <WorkspaceUpsertDialog
      className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl"
      description={record ? record.title : "Review enquiry details."}
      onClose={onClose}
      open={open}
      title={record ? `Enquiry #${record.id}` : "Enquiry"}
    >
      {record ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <WorkspaceShowCard title="Customer">
              <WorkspaceDetailTable
                rows={[
                  ["Mobile", record.mobile || "—"],
                  ["Customer", record.customer || "—"],
                  ["List in", record.enquiryGroup || "—"],
                  ["Enquiry date", record.enquiryDate || "—"]
                ]}
              />
            </WorkspaceShowCard>
            <WorkspaceShowCard title="Enquiry">
              <WorkspaceDetailTable
                rows={[
                  ["Assigned to", record.assignedTo?.name ?? "Unassigned"],
                  ["Created by", record.createdBy.name],
                  ["Priority", capitalize(record.priority)],
                  [
                    "Status",
                    <WorkspaceStatusBadge
                      key="status"
                      label={
                        record.lifecycleStatus === "suspended"
                          ? "Suspended"
                          : capitalize(record.status)
                      }
                      tone={
                        record.lifecycleStatus === "suspended"
                          ? "danger"
                          : record.status === "won"
                            ? "success"
                            : record.status === "escalation"
                              ? "danger"
                              : record.status === "follow"
                                ? "warning"
                                : "neutral"
                      }
                    />
                  ],
                  [
                    "Schedules",
                    record.schedules.length
                      ? record.schedules.map((item) => item.scheduledOn).join(", ")
                      : "—"
                  ]
                ]}
              />
            </WorkspaceShowCard>
          </div>
          <WorkspaceShowCard title="Enquiry message">
            <p className="min-h-28 whitespace-pre-wrap p-4 text-sm leading-6 text-foreground">
              {plainText(record.workspace) || "—"}
            </p>
          </WorkspaceShowCard>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button onClick={onClose} type="button" variant="outline">
              Close
            </Button>
            {onEdit ? (
              <Button onClick={onEdit} type="button">
                <Pencil className="size-4" />
                Edit enquiry
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </WorkspaceUpsertDialog>
  );
}

function capitalize(value: string) {
  return value[0]!.toUpperCase() + value.slice(1);
}

function plainText(value: string) {
  return value
    .replace(/<[^>]*>/gu, " ")
    .replace(/&nbsp;/gu, " ")
    .replace(/&amp;/gu, "&")
    .replace(/\s+/gu, " ")
    .trim();
}
