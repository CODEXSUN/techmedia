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
import { WorkspacePage } from "@codexsun/ui/workspace/page";
import { WorkspacePagination } from "@codexsun/ui/workspace/pagination";
import { WorkspaceSelect } from "@codexsun/ui/workspace/select";
import { buildShowingLabel } from "@codexsun/ui/workspace/utils";
import { TenantUserAdminForm } from "./tenant-user.admin.form";
import {
  useAdminTenantUserMutations,
  useAdminTenantUsersQuery,
  useTenantUserTenantsQuery
} from "./tenant-user.hooks";
import { TenantUserList } from "./tenant-user.list";
import type { TenantUser, TenantUserSavePayload } from "./tenant-user.types";

type PendingAction = { record: TenantUser; type: "force-delete" | "restore" | "suspend" };

export function TenantUserAdminWorkspace() {
  const tenants = useTenantUserTenantsQuery();
  const [tenantId, setTenantId] = useState(0);
  const query = useAdminTenantUsersQuery(tenantId);
  const mutations = useAdminTenantUserMutations(tenantId);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [editing, setEditing] = useState<TenantUser | null | undefined>(undefined);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (query.data ?? []).filter(
      (record) =>
        (status === "all" || record.status === status) &&
        (!term ||
          record.name.toLowerCase().includes(term) ||
          record.email.toLowerCase().includes(term))
    );
  }, [query.data, search, status]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const records = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  async function save(value: TenantUserSavePayload) {
    try {
      const record = editing
        ? await mutations.update.mutateAsync({ id: editing.id, payload: value })
        : await mutations.create.mutateAsync(value);
      toast.success(`User ${editing ? "updated" : "created"}`, { description: record.name });
      setEditing(undefined);
    } catch {}
  }

  async function act(action: PendingAction) {
    try {
      const record =
        action.type === "force-delete"
          ? await mutations.forceDelete.mutateAsync(action.record)
          : action.type === "restore"
            ? await mutations.activate.mutateAsync(action.record)
            : await mutations.deactivate.mutateAsync(action.record);
      toast.success(
        action.type === "force-delete"
          ? "User permanently deleted"
          : action.type === "restore"
            ? "User restored"
            : "User suspended",
        { description: record.name }
      );
      setPendingAction(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The user action failed.");
    }
  }

  const selectedTenant = tenants.data?.find((tenant) => tenant.id === tenantId);
  const saveError = mutations.create.error ?? mutations.update.error;
  return (
    <WorkspacePage
      actions={
        <div className="flex items-center gap-2">
          <Button
            className="h-9 rounded-md"
            disabled={!tenantId || query.isFetching}
            onClick={() => void query.refetch()}
            type="button"
            variant="outline"
          >
            <RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button
            className="h-9 rounded-md"
            disabled={!tenantId}
            onClick={() => setEditing(null)}
            type="button"
          >
            <Plus className="size-4" />
            New user
          </Button>
        </div>
      }
      description="Select a tenant, then manage its users and account lifecycle from one desk."
      technicalName="page.super-admin.tenant-users"
      title="Tenant Users"
    >
      <div className="max-w-md space-y-1.5">
        <span className="text-sm font-medium">Tenant</span>
        <WorkspaceSelect
          ariaLabel="Tenant"
          onValueChange={(value) => {
            setTenantId(Number(value));
            setEditing(undefined);
            setPendingAction(null);
            setPage(1);
          }}
          options={(tenants.data ?? []).map((tenant) => ({
            label: `${tenant.label} (${tenant.tenantCode})`,
            value: String(tenant.id)
          }))}
          placeholder={tenants.isLoading ? "Loading tenants..." : "Select tenant"}
          value={tenantId ? String(tenantId) : ""}
        />
        {selectedTenant ? (
          <p className="text-xs text-muted-foreground">
            Managing {selectedTenant.label} · {selectedTenant.status}
          </p>
        ) : null}
      </div>
      {tenants.error ? <ErrorPanel message={tenants.error.message} /> : null}
      {tenantId ? (
        <>
          <WorkspaceFilters
            filterOptions={[
              { id: "all", label: "All users" },
              { id: "active", label: "Active" },
              { id: "inactive", label: "Inactive" },
              { id: "suspended", label: "Suspended" }
            ]}
            filterValue={status}
            onFilterValueChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            onSearchValueChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            searchPlaceholder="Search tenant users"
            searchValue={search}
          />
          {query.error ? <ErrorPanel message={query.error.message} /> : null}
          <TenantUserList
            actorEmail=""
            loading={query.isFetching && !query.data}
            onEdit={setEditing}
            onForceDelete={(record) => setPendingAction({ record, type: "force-delete" })}
            onRestore={(record) => setPendingAction({ record, type: "restore" })}
            onSuspend={(record) => setPendingAction({ record, type: "suspend" })}
            records={records}
          />
          <WorkspacePagination
            onNextPage={() => setPage((value) => Math.min(totalPages, value + 1))}
            onPageChange={setPage}
            onPreviousPage={() => setPage((value) => Math.max(1, value - 1))}
            onRowsPerPageChange={(value) => {
              setRowsPerPage(value);
              setPage(1);
            }}
            page={currentPage}
            rowsPerPage={rowsPerPage}
            showingLabel={buildShowingLabel(currentPage, rowsPerPage, filtered.length)}
            singularLabel="user"
            totalCount={filtered.length}
            totalPages={totalPages}
          />
          <TenantUserAdminForm
            {...(saveError instanceof Error ? { error: saveError.message } : {})}
            loading={mutations.create.isPending || mutations.update.isPending}
            onCancel={() => setEditing(undefined)}
            onSubmit={(value) => void save(value)}
            open={editing !== undefined}
            record={editing ?? null}
          />
          <TenantUserAdminActionDialog
            action={pendingAction}
            loading={
              mutations.activate.isPending ||
              mutations.deactivate.isPending ||
              mutations.forceDelete.isPending
            }
            onCancel={() => setPendingAction(null)}
            onConfirm={() => pendingAction && void act(pendingAction)}
          />
        </>
      ) : (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          Select a tenant to load its users.
        </div>
      )}
    </WorkspacePage>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
      {message}
    </div>
  );
}

function TenantUserAdminActionDialog({
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
          <AlertDialogTitle>{verb} tenant user?</AlertDialogTitle>
          <AlertDialogDescription>
            {destructive
              ? `${action?.record.name ?? "This user"} will be permanently removed. Role assignments may block deletion.`
              : `${action?.record.name ?? "This user"} will be marked ${action?.type === "restore" ? "active" : "inactive"}.`}
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
