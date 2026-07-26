import { useState } from "react";
import { CalendarPlus, Save, Trash2 } from "lucide-react";
import { Button } from "@codexsun/ui/components/button";
import { Input } from "@codexsun/ui/components/input";
import { WorkspaceDatePicker } from "@codexsun/ui/workspace/date-picker";
import { WorkspaceLookup } from "@codexsun/ui/workspace/lookup";
import { WorkspaceMinimalEditor } from "@codexsun/ui/workspace/minimal-editor";
import { WorkspaceSelect } from "@codexsun/ui/workspace/select";
import {
  WorkspaceFormBanner,
  WorkspaceFormField,
  WorkspaceFormFooter,
  WorkspaceFormGrid,
  WorkspaceUpsertDialog
} from "@codexsun/ui/workspace/upsert";
import { crmEnquirySchema } from "./crm.schema";
import type { CrmEnquiry, CrmEnquirySavePayload, CrmUserReference } from "./crm.types";

const emptyEnquiry: CrmEnquirySavePayload = {
  assignedToUserId: null,
  customer: "",
  enquiryDate: null,
  enquiryGroup: "",
  messages: [],
  mobile: "",
  priority: "normal",
  schedules: [],
  status: "open",
  title: "",
  workspace: ""
};

export function CrmForm({
  canAssign,
  error,
  loading,
  onCancel,
  onSubmit,
  open,
  record,
  users
}: {
  canAssign: boolean;
  error?: string;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (value: CrmEnquirySavePayload) => void;
  open: boolean;
  record: CrmEnquiry | null;
  users: CrmUserReference[];
}) {
  return (
    <WorkspaceUpsertDialog
      className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden sm:max-w-4xl"
      description="Create or update a customer enquiry."
      onClose={onCancel}
      open={open}
      title={`${record ? "Edit" : "New"} enquiry`}
    >
      <CrmFormBody
        key={`${record?.id ?? "new"}:${open}`}
        {...(error ? { error } : {})}
        initialValue={
          record
            ? {
                assignedToUserId: record.assignedToUserId,
                customer: record.customer,
                enquiryDate: record.enquiryDate,
                enquiryGroup: record.enquiryGroup,
                messages: record.messages.map(({ comment }) => ({ comment })),
                mobile: record.mobile,
                priority: record.priority,
                schedules: record.schedules.map(({ scheduledOn }) => ({ scheduledOn })),
                status: record.status,
                title: record.title,
                workspace: record.workspace || record.title
              }
            : emptyEnquiry
        }
        loading={loading}
        onCancel={onCancel}
        onSubmit={onSubmit}
        record={record}
        canAssign={canAssign}
        users={users}
      />
    </WorkspaceUpsertDialog>
  );
}

function CrmFormBody({
  error,
  canAssign,
  initialValue,
  loading,
  onCancel,
  onSubmit,
  record,
  users
}: {
  canAssign: boolean;
  error?: string;
  initialValue: CrmEnquirySavePayload;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (value: CrmEnquirySavePayload) => void;
  record: CrmEnquiry | null;
  users: CrmUserReference[];
}) {
  const [value, setValue] = useState(initialValue);
  const [validationError, setValidationError] = useState("");
  const shownError = validationError || error;
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const message = getPlainText(value.workspace);
        if (message.length < 2) {
          setValidationError("Enquiry message is required.");
          return;
        }
        const parsed = crmEnquirySchema.safeParse({
          ...value,
          title: message.slice(0, 220)
        });
        if (!parsed.success) {
          setValidationError(parsed.error.issues[0]?.message ?? "Check the enquiry details.");
          return;
        }
        if (
          new Set(parsed.data.schedules.map((item) => item.scheduledOn)).size !==
          parsed.data.schedules.length
        ) {
          setValidationError("Schedule dates must be unique.");
          return;
        }
        setValidationError("");
        onSubmit(parsed.data);
      }}
      className="flex min-h-0 flex-col overflow-hidden"
    >
      <div className="min-h-0 flex-1 overflow-y-auto pr-2">
        {shownError ? (
          <WorkspaceFormBanner title="Unable to save">{shownError}</WorkspaceFormBanner>
        ) : null}
        <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,20rem)]">
          <section className="flex min-w-0 flex-col gap-5 rounded-md border border-border/80 bg-muted/10 p-4">
            <h3 className="text-sm font-semibold text-foreground">Customer and message</h3>
            <WorkspaceFormGrid>
              <WorkspaceFormField label="Mobile" required>
                <Input
                  autoFocus
                  inputMode="tel"
                  maxLength={40}
                  required
                  value={value.mobile}
                  onChange={(event) =>
                    setValue((current) => ({ ...current, mobile: event.target.value }))
                  }
                />
              </WorkspaceFormField>
              <WorkspaceFormField label="Customer">
                <Input
                  maxLength={220}
                  placeholder="Existing Frappe customer name"
                  value={value.customer}
                  onChange={(event) =>
                    setValue((current) => ({ ...current, customer: event.target.value }))
                  }
                />
              </WorkspaceFormField>
            </WorkspaceFormGrid>
            <WorkspaceFormField
              className="min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)]"
              label="Enquiry message"
              required
            >
              <WorkspaceMinimalEditor
                className="flex min-h-[18rem] flex-1 flex-col [&>div:last-child]:min-h-0 [&>div:last-child]:flex-1 [&_.tiptap]:h-full [&_.tiptap]:min-h-full"
                content={value.workspace}
                placeholder="Enter the customer enquiry..."
                onChange={(workspace) => setValue((current) => ({ ...current, workspace }))}
              />
            </WorkspaceFormField>
          </section>

          <section className="min-w-0 space-y-5 rounded-md border border-border/80 bg-muted/10 p-4">
            <h3 className="text-sm font-semibold text-foreground">Enquiry details</h3>
            <WorkspaceFormGrid columns={1}>
              <WorkspaceFormField label="List in">
                <WorkspaceSelect
                  options={[
                    "Stores",
                    "DELL",
                    "ASUS",
                    "Spares",
                    "MBO",
                    "Service",
                    "On-site",
                    "Remote - AnyDesk",
                    "Follow",
                    "Escalation",
                    "Admin"
                  ].map((item) => ({ label: item, value: item }))}
                  placeholder="Choose Frappe group"
                  value={value.enquiryGroup}
                  onValueChange={(enquiryGroup) =>
                    setValue((current) => ({ ...current, enquiryGroup }))
                  }
                />
              </WorkspaceFormField>
              <WorkspaceFormField label="Assigned to">
                <WorkspaceLookup
                  allowTextValue={false}
                  disabled={!canAssign}
                  options={users.map((user) => ({
                    description: user.email,
                    label: user.name,
                    value: String(user.id)
                  }))}
                  placeholder="Unassigned"
                  showAllOptionsOnFocus
                  value={value.assignedToUserId ? String(value.assignedToUserId) : ""}
                  onValueChange={(userId) =>
                    setValue((current) => ({
                      ...current,
                      assignedToUserId: userId || null
                    }))
                  }
                />
              </WorkspaceFormField>
              <WorkspaceFormField label="Priority" required>
                <WorkspaceSelect
                  options={[
                    { label: "Low", value: "low" },
                    { label: "Normal", value: "normal" },
                    { label: "High", value: "high" },
                    { label: "Urgent", value: "urgent" }
                  ]}
                  value={value.priority}
                  onValueChange={(priority) =>
                    setValue((current) => ({
                      ...current,
                      priority: priority as CrmEnquirySavePayload["priority"]
                    }))
                  }
                />
              </WorkspaceFormField>
              <WorkspaceFormField label="Status" required>
                <WorkspaceSelect
                  options={[
                    { label: "Open", value: "open" },
                    { label: "Follow", value: "follow" },
                    { label: "Escalation", value: "escalation" },
                    { label: "Won", value: "won" },
                    { label: "Lost", value: "lost" }
                  ]}
                  value={value.status}
                  onValueChange={(status) =>
                    setValue((current) => ({
                      ...current,
                      status: status as CrmEnquirySavePayload["status"]
                    }))
                  }
                />
              </WorkspaceFormField>
            </WorkspaceFormGrid>
            <div className="space-y-3 rounded-md border border-border/70 bg-background/70 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">Schedules</div>
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setValue((current) => ({
                      ...current,
                      schedules: [...current.schedules, { scheduledOn: "" }]
                    }))
                  }
                >
                  <CalendarPlus className="size-4" /> Add date
                </Button>
              </div>
              {value.schedules.length === 0 ? (
                <p className="text-sm text-muted-foreground">No schedule dates added.</p>
              ) : null}
              {value.schedules.map((schedule, index) => (
                <div className="flex items-center gap-2" key={`${index}:${schedule.scheduledOn}`}>
                  <WorkspaceDatePicker
                    ariaLabel={`Schedule date ${index + 1}`}
                    value={schedule.scheduledOn}
                    onValueChange={(scheduledOn) =>
                      setValue((current) => ({
                        ...current,
                        schedules: current.schedules.map((item, itemIndex) =>
                          itemIndex === index ? { scheduledOn } : item
                        )
                      }))
                    }
                  />
                  <Button
                    aria-label={`Remove schedule date ${index + 1}`}
                    size="icon"
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setValue((current) => ({
                        ...current,
                        schedules: current.schedules.filter((_, itemIndex) => itemIndex !== index)
                      }))
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
      <WorkspaceFormFooter
        className="mt-4 shrink-0 border-t pt-4"
        onCancel={onCancel}
        primaryLabel={record ? "Update enquiry" : "Save enquiry"}
        primaryLoading={loading}
        primaryProps={{
          children: (
            <>
              <Save className="size-4" />
              {record ? "Update enquiry" : "Save enquiry"}
            </>
          )
        }}
      ></WorkspaceFormFooter>
    </form>
  );
}

function getPlainText(value: string) {
  return value
    .replace(/<[^>]*>/gu, " ")
    .replace(/&nbsp;/gu, " ")
    .replace(/&amp;/gu, "&")
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/\s+/gu, " ")
    .trim();
}
