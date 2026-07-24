import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
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
import { WorkspaceLookup } from "@codexsun/ui/workspace/lookup";
import { WorkspacePage } from "@codexsun/ui/workspace/page";
import { WorkspacePagination } from "@codexsun/ui/workspace/pagination";
import { buildShowingLabel } from "@codexsun/ui/workspace/utils";
import { CrmForm } from "./crm.form";
import {
  useCrmEnquiriesQuery,
  useCrmEnquiryMutations,
  useCrmReferencesQuery,
  useCrmUsersQuery
} from "./crm.hooks";
import { CrmList } from "./crm.list";
import { CrmShow } from "./crm.show";
import type {
  CrmEnquiry,
  CrmEnquiryColumnId,
  CrmEnquiryColumnVisibility,
  CrmEnquirySavePayload,
  CrmEnquiryView
} from "./crm.types";

type PendingAction = {
  record: CrmEnquiry;
  type: "force-delete" | "restore" | "suspend";
};

const viewDetails: Record<CrmEnquiryView, { description: string; title: string }> = {
  assigned: { description: "Enquiries assigned to your user account.", title: "My Enquiry" },
  created: { description: "Enquiries created by your account.", title: "Enquiry created by me" },
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
  { id: "status", label: "Status" }
];

function allEnquiryColumnsVisible(): CrmEnquiryColumnVisibility {
  return Object.fromEntries(
    enquiryColumnOptions.map((column) => [column.id, true])
  ) as CrmEnquiryColumnVisibility;
}

export function CrmWorkspace({
  canAssign,
  canCreate,
  canForceDelete,
  canSuspend,
  canUpdate,
  view
}: {
  canAssign: boolean;
  canCreate: boolean;
  canForceDelete: boolean;
  canSuspend: boolean;
  canUpdate: boolean;
  view: CrmEnquiryView;
}) {
  const [search, setSearch] = useState("");
  const [enquiryId, setEnquiryId] = useState<number | undefined>();
  const [listInFilter, setListInFilter] = useState("all");
  const [visibleColumns, setVisibleColumns] =
    useState<CrmEnquiryColumnVisibility>(allEnquiryColumnsVisible);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [editing, setEditing] = useState<CrmEnquiry | null | undefined>(undefined);
  const [viewing, setViewing] = useState<CrmEnquiry | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const query = useCrmEnquiriesQuery({
    view,
    ...(search ? { search } : {}),
    ...(enquiryId ? { enquiryId } : {})
  });
  const references = useCrmReferencesQuery();
  const users = useCrmUsersQuery();
  const mutations = useCrmEnquiryMutations();
  const records = query.data ?? [];
  const listInOptions = useMemo(
    () => [
      { id: "all", label: "All lists" },
      ...Array.from(new Set(records.map((record) => record.enquiryGroup.trim()).filter(Boolean)))
        .sort((left, right) => left.localeCompare(right))
        .map((group) => ({ id: `group:${group}`, label: group }))
    ],
    [records]
  );
  const filteredRecords = useMemo(
    () =>
      listInFilter === "all"
        ? records
        : records.filter((record) => `group:${record.enquiryGroup.trim()}` === listInFilter),
    [listInFilter, records]
  );
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const visibleRecords = filteredRecords.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );
  const viewingIndex = viewing
    ? filteredRecords.findIndex((record) => record.id === viewing.id)
    : -1;
  const nextViewing =
    viewingIndex >= 0 && viewingIndex < filteredRecords.length - 1
      ? filteredRecords[viewingIndex + 1]
      : undefined;
  const details = viewDetails[view];

  useEffect(() => setPage(1), [view, search, enquiryId, listInFilter]);
  useEffect(() => {
    if (!listInOptions.some((option) => option.id === listInFilter)) setListInFilter("all");
  }, [listInFilter, listInOptions]);

  async function save(value: CrmEnquirySavePayload) {
    try {
      const saved = editing
        ? await mutations.update.mutateAsync({ id: editing.id, payload: value })
        : await mutations.create.mutateAsync(value);
      toast.success(`Enquiry ${editing ? "updated" : "created"}`, {
        description: `#${saved.id} · ${saved.subject.trim() || saved.title}`
      });
      setEditing(undefined);
    } catch {}
  }

  async function act(action: PendingAction) {
    try {
      const record =
        action.type === "force-delete"
          ? await mutations.forceDelete.mutateAsync(action.record)
          : action.type === "restore"
            ? await mutations.restore.mutateAsync(action.record)
            : await mutations.suspend.mutateAsync(action.record);
      toast.success(
        action.type === "force-delete"
          ? "Enquiry permanently deleted"
          : action.type === "restore"
            ? "Enquiry restored"
            : "Enquiry suspended",
        { description: `#${record.id} · ${record.subject.trim() || record.title}` }
      );
      setPendingAction(null);
      if (viewing?.id === record.id) setViewing(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The enquiry action failed.");
    }
  }

  async function resync(record: CrmEnquiry) {
    try {
      const result = await mutations.resync.mutateAsync(record);
      toast.success("Enquiry synchronized with Frappe", {
        description: `${result.frappeName} · ${result.action === "created" ? "Created" : "Updated"}`
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The Frappe synchronization failed.");
    }
  }

  if (viewing) {
    return (
      <CrmShow
        canResync={canUpdate}
        onBack={() => setViewing(null)}
        {...(nextViewing ? { onNext: () => setViewing(nextViewing) } : {})}
        onRecordChange={setViewing}
        onResync={() => resync(viewing)}
        record={viewing}
        resyncing={mutations.resync.isPending}
      />
    );
  }

  return (
    <WorkspacePage
      actions={
        <div className="flex items-center gap-2">
          <Button
            className="h-9 rounded-md"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
            type="button"
            variant="outline"
          >
            <RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} /> Refresh
          </Button>
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
        filterOptions={listInOptions}
        filterValue={listInFilter}
        onFilterValueChange={(value) => {
          setListInFilter(value);
          setPage(1);
        }}
        onSearchValueChange={setSearch}
        onShowAllColumns={() => setVisibleColumns(allEnquiryColumnsVisible())}
        searchPlaceholder="Search title or enquiry ID"
        searchValue={search}
        toolbarAction={
          <div className="w-64">
            <WorkspaceLookup
              allowTextValue={false}
              compactOptions
              loading={references.isLoading}
              options={(references.data ?? []).map((reference) => ({
                label: `#${reference.id} · ${reference.title}`,
                value: String(reference.id)
              }))}
              placeholder="Enquiry ID"
              showAllOptionsOnFocus
              value={enquiryId ? String(enquiryId) : ""}
              onValueChange={(value) => setEnquiryId(value ? Number(value) : undefined)}
            />
          </div>
        }
      />
      <CrmList
        {...(canForceDelete
          ? {
              onForceDelete: (record) => setPendingAction({ record, type: "force-delete" as const })
            }
          : {})}
        {...(canSuspend
          ? {
              onRestore: (record) => setPendingAction({ record, type: "restore" as const }),
              onSuspend: (record) => setPendingAction({ record, type: "suspend" as const })
            }
          : {})}
        {...(canUpdate ? { onSelect: setEditing } : {})}
        onView={setViewing}
        records={visibleRecords}
        visibleColumns={{
          ...visibleColumns,
          assignedTo: view === "assigned" ? false : visibleColumns.assignedTo
        }}
      />
      <WorkspacePagination
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildShowingLabel(currentPage, rowsPerPage, filteredRecords.length)}
        singularLabel="enquiry"
        totalCount={filteredRecords.length}
        totalPages={totalPages}
        onNextPage={() => setPage((value) => Math.min(totalPages, value + 1))}
        onPageChange={setPage}
        onPreviousPage={() => setPage((value) => Math.max(1, value - 1))}
        onRowsPerPageChange={(value) => {
          setRowsPerPage(value);
          setPage(1);
        }}
      />
      <CrmForm
        canAssign={canAssign}
        {...((mutations.create.error ?? mutations.update.error) instanceof Error
          ? { error: (mutations.create.error ?? (mutations.update.error as Error)).message }
          : {})}
        loading={mutations.create.isPending || mutations.update.isPending}
        onCancel={() => setEditing(undefined)}
        onResync={() => editing && resync(editing)}
        onSubmit={(value) => void save(value)}
        open={editing !== undefined}
        record={editing ?? null}
        resyncing={mutations.resync.isPending}
        users={users.data ?? []}
      />
      <CrmActionDialog
        action={pendingAction}
        loading={
          mutations.forceDelete.isPending ||
          mutations.restore.isPending ||
          mutations.suspend.isPending
        }
        onCancel={() => setPendingAction(null)}
        onConfirm={() => pendingAction && void act(pendingAction)}
      />
    </WorkspacePage>
  );
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
  const destructive = action?.type === "force-delete";
  const verb = action?.type === "restore" ? "Restore" : destructive ? "Force delete" : "Suspend";
  return (
    <AlertDialog open={action !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{verb} enquiry?</AlertDialogTitle>
          <AlertDialogDescription>
            {destructive
              ? `Enquiry #${action?.record.id ?? ""} will be permanently removed, including its schedules and Frappe link.`
              : `Enquiry #${action?.record.id ?? ""} will be ${action?.type === "restore" ? "restored" : "suspended"}.`}
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
