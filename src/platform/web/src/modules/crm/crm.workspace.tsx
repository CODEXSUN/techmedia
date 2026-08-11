import { useEffect, useState } from "react";
import { BellOff, BellRing, Plus, RefreshCw } from "lucide-react";
import { toast } from "@codexsun/ui/components/sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@codexsun/ui/components/alert-dialog";
import { Button } from "@codexsun/ui/components/button";
import { cn } from "@codexsun/ui/lib/utils";
import { WorkspaceFilters } from "@codexsun/ui/workspace/filters";
import { WorkspacePage } from "@codexsun/ui/workspace/page";
import { WorkspacePagination } from "@codexsun/ui/workspace/pagination";
import { buildShowingLabel } from "@codexsun/ui/workspace/utils";
import { CrmForm } from "./crm.form";
import {
  useBrowserNotificationPermission,
  useCrmCallNotificationPreference
} from "./crm.call-notifications";
import { useCrmEnquiriesQuery, useCrmEnquiryMutations, useCrmUsersQuery } from "./crm.hooks";
import { CrmList } from "./crm.list";
import { CrmShow } from "./crm.show";
import { getCrmEnquiry } from "./crm.services";
import type {
  CrmEnquiry,
  CrmEnquiryColumnId,
  CrmEnquiryColumnVisibility,
  CrmEnquirySavePayload,
  CrmEnquiryStatusFilter,
  CrmEnquiryView
} from "./crm.types";

type PendingAction = {
  record: CrmEnquiry;
  type: "force-delete";
};

type EnquirySort = {
  column: CrmEnquiryColumnId;
  direction: "asc" | "desc";
};

const viewDetails: Record<CrmEnquiryView, { description: string; title: string }> = {
  assigned: { description: "Enquiries assigned to your user account.", title: "My Job" },
  created: { description: "Enquiries created by your account.", title: "My Calls" },
  open: {
    description: "Active unresolved enquiries not assigned to any user.",
    title: "Open Enquiry"
  }
};

const enquiryColumnOptions: Array<{ id: CrmEnquiryColumnId; label: string }> = [
  { id: "id", label: "ID" },
  { id: "mobile", label: "Mobile" },
  { id: "customer", label: "Customer" },
  { id: "title", label: "Enquiry details" },
  { id: "enquiryGroup", label: "List in" },
  { id: "dueDate", label: "Due date" },
  { id: "createdBy", label: "User" },
  { id: "assignedTo", label: "Assigned to" },
  { id: "priority", label: "Priority" },
  { id: "status", label: "Status" }
];

function allEnquiryColumnsVisible(): CrmEnquiryColumnVisibility {
  return Object.fromEntries(
    enquiryColumnOptions.map((column) => [column.id, true])
  ) as CrmEnquiryColumnVisibility;
}

function defaultEnquiryColumnVisibility(): CrmEnquiryColumnVisibility {
  return {
    ...allEnquiryColumnsVisible(),
    mobile: false
  };
}

export function CrmWorkspace({
  canAssign,
  canCreate,
  canCreateEstimate,
  canCreateQuotation,
  canForceDelete,
  canManageJobs,
  canRefresh,
  canUpdateEstimate,
  canUpdateQuotation,
  onSearchValueChange,
  searchValue,
  showActivity,
  showProperties,
  canUpdate,
  view
}: {
  canAssign: boolean;
  canCreate: boolean;
  canCreateEstimate: boolean;
  canCreateQuotation: boolean;
  canForceDelete: boolean;
  canManageJobs: boolean;
  canRefresh: boolean;
  canSuspend: boolean;
  canUpdate: boolean;
  canUpdateEstimate: boolean;
  canUpdateQuotation: boolean;
  onSearchValueChange: (value: string) => void;
  searchValue: string;
  showActivity: boolean;
  showProperties: boolean;
  view: CrmEnquiryView;
}) {
  const [statusFilter, setStatusFilter] = useState<CrmEnquiryStatusFilter>(statusFilterFromUrl);
  const [visibleColumns, setVisibleColumns] = useState<CrmEnquiryColumnVisibility>(
    defaultEnquiryColumnVisibility
  );
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [sort, setSort] = useState<EnquirySort>({ column: "id", direction: "desc" });
  const [editing, setEditing] = useState<CrmEnquiry | null | undefined>(undefined);
  const [viewing, setViewing] = useState<CrmEnquiry | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const query = useCrmEnquiriesQuery({
    view,
    status: statusFilter,
    ...(searchValue ? { search: searchValue } : {})
  });
  const users = useCrmUsersQuery();
  const mutations = useCrmEnquiryMutations();
  const initialLoading = query.data === undefined && query.isFetching;
  const records = query.data ?? [];
  const browserNotifications = useBrowserNotificationPermission();
  const notificationPreference = useCrmCallNotificationPreference();
  const sortedRecords = [...records].sort((left, right) => compareEnquiries(left, right, sort));
  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const visibleRecords = sortedRecords.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );
  const viewingIndex = viewing ? records.findIndex((record) => record.id === viewing.id) : -1;
  const nextViewing =
    viewingIndex >= 0 && viewingIndex < records.length - 1 ? records[viewingIndex + 1] : undefined;
  const details = viewDetails[view];

  async function loadRecord(record: CrmEnquiry, target: "edit" | "view") {
    try {
      const live = await getCrmEnquiry(record.frappeName);
      if (target === "edit") setEditing(live);
      else setViewing(live);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The live Frappe enquiry could not be loaded."
      );
    }
  }

  useEffect(() => setPage(1), [view, searchValue, statusFilter]);

  async function save(value: CrmEnquirySavePayload) {
    try {
      const saved = editing
        ? await mutations.update.mutateAsync({ id: editing.frappeName, payload: value })
        : await mutations.create.mutateAsync(value);
      toast.success(`Enquiry ${editing ? "updated" : "created"}`, {
        description: `#${saved.id} · ${saved.title}`
      });
      setEditing(undefined);
    } catch {}
  }

  async function act(action: PendingAction) {
    try {
      const record = await mutations.forceDelete.mutateAsync(action.record);
      toast.success("Enquiry permanently deleted", {
        description: `#${record.id} · ${record.title}`
      });
      setPendingAction(null);
      if (viewing?.id === record.id) setViewing(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The enquiry action failed.");
    }
  }

  function toggleDesktopAlerts() {
    if (browserNotifications.permission === "granted") {
      notificationPreference.setEnabled(!notificationPreference.enabled);
      return;
    }
    void browserNotifications.requestPermission().then((permission) => {
      if (permission === "granted") notificationPreference.setEnabled(true);
    });
  }

  if (viewing) {
    return (
      <CrmShow
        canAssign={canAssign}
        canCreateEstimate={canCreateEstimate}
        canCreateQuotation={canCreateQuotation}
        canManageJobs={canManageJobs}
        canUpdate={canUpdate}
        canUpdateEstimate={canUpdateEstimate}
        canUpdateQuotation={canUpdateQuotation}
        showActivity={showActivity}
        showProperties={showProperties}
        onBack={() => setViewing(null)}
        {...(nextViewing ? { onNext: () => void loadRecord(nextViewing, "view") } : {})}
        onRecordChange={setViewing}
        record={viewing}
        view={view}
      />
    );
  }

  return (
    <WorkspacePage
      actions={
        canRefresh || canCreate || view === "created" ? (
          <div className="flex items-center gap-2">
            {view === "created" && browserNotifications.isSupported ? (
              <Button
                className="h-9 rounded-md"
                disabled={browserNotifications.permission === "denied"}
                title={
                  browserNotifications.permission === "denied"
                    ? "Allow notifications in the browser settings to enable desktop alerts."
                    : notificationPreference.enabled && browserNotifications.permission === "granted"
                      ? "Disable desktop notifications for My Calls."
                      : "Enable desktop notifications for My Calls."
                }
                type="button"
                variant="outline"
                onClick={toggleDesktopAlerts}
              >
                {notificationPreference.enabled && browserNotifications.permission === "granted" ? (
                  <BellOff className="size-4" />
                ) : (
                  <BellRing className="size-4" />
                )}
                {notificationPreference.enabled && browserNotifications.permission === "granted"
                  ? "Desktop alerts on"
                  : "Desktop alerts off"}
              </Button>
            ) : null}
            {canRefresh ? (
              <Button
                className="h-9 rounded-md"
                disabled={query.isFetching}
                onClick={() => void query.refetch()}
                type="button"
                variant="outline"
              >
                <RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} /> Refresh
              </Button>
            ) : null}
            {canCreate ? (
              <Button
                className="h-9 rounded-md"
                disabled={users.isLoading || !users.data?.length}
                onClick={() => setEditing(null)}
                type="button"
              >
                <Plus className="size-4" /> New enquiry
              </Button>
            ) : null}
          </div>
        ) : null
      }
      description={details.description}
      technicalName={`page.crm.enquiry.${view}`}
      title={details.title}
    >
      <WorkspaceFilters
        columnOptions={enquiryColumnOptions
          .filter((column) => view !== "assigned" || column.id !== "assignedTo")
          .map((column) => ({
            ...column,
            checked: visibleColumns[column.id],
            onCheckedChange: (checked) =>
              setVisibleColumns((current) => ({ ...current, [column.id]: checked }))
          }))}
        filterOptions={[
          { id: "active", label: "Active (open, follow, escalation)" },
          { id: "in-progress", label: "In progress (follow, escalation)" },
          { id: "closed", label: "Closed (won, lost)" },
          { id: "open", label: "Open" },
          { id: "follow", label: "Follow" },
          { id: "escalation", label: "Escalation" },
          { id: "won", label: "Won" },
          { id: "lost", label: "Lost" }
        ]}
        filterValue={statusFilter}
        onFilterValueChange={(value) => {
          setStatusFilter(value as CrmEnquiryStatusFilter);
          setPage(1);
        }}
        onSearchValueChange={onSearchValueChange}
        onShowAllColumns={() => setVisibleColumns(allEnquiryColumnsVisible())}
        searchPlaceholder="Search ID, enquiry details, phone, or customer"
        searchValue={searchValue}
      />
      <CrmList
        error={query.isError}
        loading={initialLoading}
        {...(canForceDelete
          ? {
              onForceDelete: (record) => setPendingAction({ record, type: "force-delete" as const })
            }
          : {})}
        {...(canUpdate ? { onSelect: (record) => void loadRecord(record, "edit") } : {})}
        {...(view === "assigned" || view === "created"
          ? { onRowClick: (record) => void loadRecord(record, "view") }
          : {})}
        onView={(record) => void loadRecord(record, "view")}
        onSort={(column) =>
          setSort((current) => ({
            column,
            direction: current.column === column && current.direction === "asc" ? "desc" : "asc"
          }))
        }
        records={visibleRecords}
        sort={sort}
        visibleColumns={{
          ...visibleColumns,
          assignedTo: view === "assigned" ? false : visibleColumns.assignedTo
        }}
      />
      {query.data !== undefined ? (
        <WorkspacePagination
          page={currentPage}
          rowsPerPage={rowsPerPage}
          showingLabel={buildShowingLabel(currentPage, rowsPerPage, records.length)}
          singularLabel="enquiry"
          totalCount={records.length}
          totalPages={totalPages}
          onNextPage={() => setPage((value) => Math.min(totalPages, value + 1))}
          onPageChange={setPage}
          onPreviousPage={() => setPage((value) => Math.max(1, value - 1))}
          onRowsPerPageChange={(value) => {
            setRowsPerPage(value);
            setPage(1);
          }}
        />
      ) : null}
      <CrmForm
        canAssign={canAssign}
        {...((mutations.create.error ?? mutations.update.error) instanceof Error
          ? { error: (mutations.create.error ?? (mutations.update.error as Error)).message }
          : {})}
        loading={mutations.create.isPending || mutations.update.isPending}
        onCancel={() => setEditing(undefined)}
        onSubmit={(value) => void save(value)}
        open={editing !== undefined}
        record={editing ?? null}
        users={users.data ?? []}
      />
      <CrmActionDialog
        action={pendingAction}
        loading={mutations.forceDelete.isPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => pendingAction && void act(pendingAction)}
      />
    </WorkspacePage>
  );
}

function compareEnquiries(left: CrmEnquiry, right: CrmEnquiry, sort: EnquirySort) {
  const direction = sort.direction === "asc" ? 1 : -1;
  const values: Record<CrmEnquiryColumnId, string | number> = {
    assignedTo: left.assignedTo?.name ?? "",
    createdBy: left.createdBy.name,
    customer: left.customer,
    dueDate: left.enquiryDate ?? "",
    enquiryGroup: left.enquiryGroup,
    id: left.id,
    mobile: left.mobile,
    priority: left.priority,
    status: left.status,
    title: left.title || left.workspace
  };
  const other: Record<CrmEnquiryColumnId, string | number> = {
    assignedTo: right.assignedTo?.name ?? "",
    createdBy: right.createdBy.name,
    customer: right.customer,
    dueDate: right.enquiryDate ?? "",
    enquiryGroup: right.enquiryGroup,
    id: right.id,
    mobile: right.mobile,
    priority: right.priority,
    status: right.status,
    title: right.title || right.workspace
  };
  const a = values[sort.column];
  const b = other[sort.column];
  return typeof a === "number" && typeof b === "number"
    ? (a - b) * direction
    : String(a).localeCompare(String(b), undefined, { numeric: true }) * direction;
}

function statusFilterFromUrl(): CrmEnquiryStatusFilter {
  if (typeof window === "undefined") return "active";
  const value = new URLSearchParams(window.location.search).get("status");
  return [
    "active",
    "in-progress",
    "closed",
    "open",
    "follow",
    "escalation",
    "won",
    "lost",
    "new",
    "hold-for-approval",
    "hold-for-spares",
    "hold-for-job-out",
    "long-hold",
    "reopen"
  ].includes(value ?? "")
    ? (value as CrmEnquiryStatusFilter)
    : "active";
}

function CrmActionDialog({
  action,
  loading,
  onCancel,
  onConfirm
}: {
  action: PendingAction | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const destructive = true;
  const verb = "Force delete";
  return (
    <AlertDialog open={action !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{verb} enquiry?</AlertDialogTitle>
          <AlertDialogDescription>
            {`Enquiry #${action?.record.id ?? ""} will be permanently removed from Frappe.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={
              destructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : undefined
            }
            disabled={loading}
            onClick={onConfirm}
          >
            {verb}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
