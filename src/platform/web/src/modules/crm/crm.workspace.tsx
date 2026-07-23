import { useEffect, useState } from "react";
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
import type { CrmEnquiry, CrmEnquirySavePayload, CrmEnquiryView } from "./crm.types";

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
  const totalPages = Math.max(1, Math.ceil(records.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const visibleRecords = records.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const details = viewDetails[view];

  useEffect(() => setPage(1), [view, search, enquiryId]);

  async function save(value: CrmEnquirySavePayload) {
    try {
      const saved = editing
        ? await mutations.update.mutateAsync({ id: editing.id, payload: value })
        : await mutations.create.mutateAsync(value);
      toast.success(`Enquiry ${editing ? "updated" : "created"}`, {
        description: `#${saved.id} · ${saved.title}`
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
        { description: `#${record.id} · ${record.title}` }
      );
      setPendingAction(null);
      if (viewing?.id === record.id) setViewing(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The enquiry action failed.");
    }
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
        onSearchValueChange={setSearch}
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
      />
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
      <CrmShow
        onClose={() => setViewing(null)}
        {...(canUpdate && viewing?.lifecycleStatus === "active"
          ? {
              onEdit: () => {
                setEditing(viewing);
                setViewing(null);
              }
            }
          : {})}
        open={viewing !== null}
        record={viewing}
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
