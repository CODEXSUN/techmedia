import { useEffect, useState } from "react";
import { Save } from "lucide-react";
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
import { useCrmCustomerReferencesQuery } from "./crm.hooks";
import { crmEnquiryListInOptions, crmEnquiryStatusOptions } from "./crm.options";
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
      className="h-[100dvh] w-full max-w-none grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-none sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:max-w-4xl sm:rounded-lg"
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
        open={open}
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
  open,
  record,
  users
}: {
  canAssign: boolean;
  error?: string;
  initialValue: CrmEnquirySavePayload;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (value: CrmEnquirySavePayload) => void;
  open: boolean;
  record: CrmEnquiry | null;
  users: CrmUserReference[];
}) {
  const [value, setValue] = useState(initialValue);
  const [customerSearch, setCustomerSearch] = useState(initialValue.customer);
  const [settledCustomerSearch, setSettledCustomerSearch] = useState(initialValue.customer);
  const [validationError, setValidationError] = useState("");
  const [mobileBlurred, setMobileBlurred] = useState(false);
  const customers = useCrmCustomerReferencesQuery(settledCustomerSearch, open);
  const customerError = customers.error instanceof Error ? customers.error.message : "";
  const shownError = validationError || error || customerError;
  const mobileHint = mobileDigitHint(value.mobile);

  useEffect(() => {
    const timer = window.setTimeout(() => setSettledCustomerSearch(customerSearch), 250);
    return () => window.clearTimeout(timer);
  }, [customerSearch]);

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
        const parsed = crmEnquirySchema.safeParse(value);
        if (!parsed.success) {
          setValidationError(parsed.error.issues[0]?.message ?? "Check the enquiry details.");
          return;
        }
        setValidationError("");
        onSubmit({
          ...parsed.data,
          messages: record ? parsed.data.messages : [{ comment: value.workspace.trim() }]
        });
      }}
      className="flex min-h-0 flex-col overflow-hidden"
    >
      <div className="min-h-0 flex-1 overflow-y-auto pr-2">
        {shownError ? (
          <WorkspaceFormBanner title="Unable to save">{shownError}</WorkspaceFormBanner>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,20rem)]">
          <section className="flex min-w-0 flex-col gap-5 rounded-md border border-border/80 bg-muted/10 p-4">
            <WorkspaceFormGrid>
              <WorkspaceFormField label="Mobile" required>
                <div className="grid gap-1.5">
                  <Input
                    {...(mobileHint ? { "aria-describedby": "enquiry-mobile-hint" } : {})}
                    aria-invalid={value.mobile.length > 0 && value.mobile.length !== 10}
                    autoFocus
                    className={
                      mobileBlurred && value.mobile.length === 10
                        ? "border-emerald-500 focus-visible:ring-emerald-500"
                        : undefined
                    }
                    inputMode="tel"
                    maxLength={10}
                    pattern="[0-9]{10}"
                    required
                    value={value.mobile}
                    onBlur={() => setMobileBlurred(true)}
                    onChange={(event) => {
                      setMobileBlurred(false);
                      setValue((current) => ({
                        ...current,
                        mobile: normalizeMobile(event.target.value)
                      }));
                    }}
                    onFocus={() => setMobileBlurred(false)}
                  />
                  {mobileHint ? (
                    <p className="text-xs text-muted-foreground" id="enquiry-mobile-hint">
                      {mobileHint}
                    </p>
                  ) : null}
                </div>
              </WorkspaceFormField>
              <WorkspaceFormField label="Customer">
                <WorkspaceLookup
                  allowTextValue={false}
                  loading={customers.isFetching}
                  onTextChange={setCustomerSearch}
                  options={(customers.data ?? []).map((customer) => ({
                    label: customer.name,
                    value: customer.id
                  }))}
                  placeholder="Search existing customer"
                  showAllOptionsOnFocus
                  value={value.customer}
                  onValueChange={(customer) => setValue((current) => ({ ...current, customer }))}
                />
              </WorkspaceFormField>
            </WorkspaceFormGrid>
            <WorkspaceFormField
              className="min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)]"
              label="Enquiry message"
              required
            >
              <WorkspaceMinimalEditor
                className="flex min-h-52 flex-1 flex-col sm:min-h-[18rem] [&>div:last-child]:min-h-0 [&>div:last-child]:flex-1 [&_.tiptap]:h-full [&_.tiptap]:min-h-full"
                content={value.workspace}
                placeholder="Enter the customer enquiry..."
                onChange={(workspace) =>
                  setValue((current) => ({
                    ...current,
                    title: shouldUseMessageTitle(current)
                      ? titleFromMessage(workspace)
                      : current.title,
                    workspace
                  }))
                }
              />
            </WorkspaceFormField>
            <WorkspaceFormField label="Title">
              <Input
                maxLength={220}
                placeholder="Auto-filled from the enquiry message"
                value={value.title}
                onChange={(event) =>
                  setValue((current) => ({ ...current, title: event.target.value }))
                }
              />
            </WorkspaceFormField>
          </section>

          <section className="min-w-0 space-y-5 rounded-md border border-border/80 bg-muted/10 p-4">
            <WorkspaceFormGrid columns={1}>
              <WorkspaceFormField label="List in">
                <WorkspaceSelect
                  options={crmEnquiryListInOptions}
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
                    { label: "Low", swatchClassName: "bg-sky-500", value: "low" },
                    { label: "Normal", swatchClassName: "bg-teal-500", value: "normal" },
                    { label: "High", swatchClassName: "bg-amber-500", value: "high" },
                    { label: "Urgent", swatchClassName: "bg-red-500", value: "urgent" }
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
                  options={crmEnquiryStatusOptions}
                  value={value.status}
                  onValueChange={(status) =>
                    setValue((current) => ({
                      ...current,
                      status: status as CrmEnquirySavePayload["status"]
                    }))
                  }
                />
              </WorkspaceFormField>
              <WorkspaceFormField label="Due date">
                <WorkspaceDatePicker
                  ariaLabel="Enquiry due date"
                  value={value.enquiryDate ?? ""}
                  onValueChange={(enquiryDate) =>
                    setValue((current) => ({ ...current, enquiryDate: enquiryDate || null }))
                  }
                />
              </WorkspaceFormField>
            </WorkspaceFormGrid>
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

function titleFromMessage(value: string) {
  return getPlainText(value).split(/\s+/u).slice(0, 8).join(" ");
}

function shouldUseMessageTitle(value: CrmEnquirySavePayload) {
  return !value.title.trim() || value.title === titleFromMessage(value.workspace);
}

function normalizeMobile(value: string) {
  return value.replace(/\D/gu, "").slice(0, 10);
}

function mobileDigitHint(value: string) {
  if (!value.length || value.length === 10) return "";
  return `${10 - value.length} digit${value.length === 9 ? "" : "s"} remaining`;
}
