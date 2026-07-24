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
import { buildShowingLabel } from "@codexsun/ui/workspace/utils";
import { TenantUserForm } from "./tenant-user.form";
import { useTenantUserMutations, useTenantUsersQuery } from "./tenant-user.hooks";
import { TenantUserList } from "./tenant-user.list";
import {
  useTenantUserRoleLookups,
  useTenantUserRoleMutations,
  useTenantUserRolesQuery
} from "../tenant-user-role";
import type {
  TenantUser,
  TenantUserAccessSelection,
  TenantUserFrappeVerification,
  TenantUserSavePayload
} from "./tenant-user.types";
type PendingAction = { record: TenantUser; type: "force-delete" | "restore" | "suspend" };
export function TenantUserWorkspace({ actorEmail }: { actorEmail: string }) {
  const query = useTenantUsersQuery();
  const mutations = useTenantUserMutations();
  const userRoleQuery = useTenantUserRolesQuery();
  const userRoleLookups = useTenantUserRoleLookups();
  const userRoleMutations = useTenantUserRoleMutations();
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
  const saveError = mutations.create.error ?? mutations.update.error;
  const selectedAccess = useMemo<TenantUserAccessSelection>(() => {
    const assignedRole = editing
      ? (userRoleQuery.data ?? []).find(
          (assignment) => assignment.userId === editing.id && assignment.status === "active"
        )
      : undefined;
    const defaultRole = userRoleLookups.data?.second.find(
      (role) => role.key === "user" && role.status === "active"
    );
    return {
      roleId: assignedRole?.roleId ?? defaultRole?.id ?? null
    };
  }, [editing, userRoleLookups.data, userRoleQuery.data]);
  async function applyRole(userId: number, access: TenantUserAccessSelection) {
    if (!access.roleId) return;
    const currentUserRole = (userRoleQuery.data ?? []).find(
      (assignment) => assignment.userId === userId && assignment.roleId === access.roleId
    );
    if (!currentUserRole) {
      await userRoleMutations.create.mutateAsync({
        roleId: access.roleId,
        status: "active",
        userId
      });
    } else if (currentUserRole.status !== "active") {
      await userRoleMutations.activate.mutateAsync(currentUserRole);
    }
  }
  async function save(value: TenantUserSavePayload, access: TenantUserAccessSelection) {
    try {
      const record = editing
        ? await mutations.update.mutateAsync({ id: editing.id, payload: value })
        : await mutations.create.mutateAsync(value);
      if (!record.isProtected) await applyRole(record.id, access);
      if (value.frappeApiKey || value.frappeApiSecret) {
        try {
          const verification = await mutations.verifyFrappe.mutateAsync(record);
          toast.success("Frappe credentials verified", {
            description: `${verification.authenticatedUser} · ${verification.employeeCode}`
          });
        } catch (error) {
          toast.warning("User saved; Frappe verification is pending", {
            description:
              error instanceof Error ? error.message : "Check the Frappe connection and retry."
          });
        }
      }
      toast.success(`User ${editing ? "updated" : "created"}`, { description: record.name });
      setEditing(undefined);
    } catch {}
  }
  async function verifyFrappe(value: TenantUserSavePayload): Promise<TenantUserFrappeVerification> {
    if (!editing) throw new Error("Save the user before verifying Frappe credentials.");
    const record = await mutations.update.mutateAsync({ id: editing.id, payload: value });
    const verification = await mutations.verifyFrappe.mutateAsync(record);
    toast.success("Frappe connection verified", {
      description: `Connected as ${verification.authenticatedUser} · ${verification.employeeCode}`
    });
    return verification;
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
            <RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button className="h-9 rounded-md" onClick={() => setEditing(null)} type="button">
            <Plus className="size-4" />
            New user
          </Button>
        </div>
      }
      description="Manage tenant users, credentials, and account lifecycle."
      technicalName="page.application.access.users"
      title="Users"
    >
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
        searchPlaceholder="Search users"
        searchValue={search}
      />
      <TenantUserList
        actorEmail={actorEmail}
        loading={query.isFetching && !query.data}
        onEdit={setEditing}
        onForceDelete={(record) => setPendingAction({ record, type: "force-delete" })}
        onRestore={(record) => setPendingAction({ record, type: "restore" })}
        onSuspend={(record) => setPendingAction({ record, type: "suspend" })}
        records={records}
      />
      <WorkspacePagination
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildShowingLabel(currentPage, rowsPerPage, filtered.length)}
        singularLabel="user"
        totalCount={filtered.length}
        totalPages={totalPages}
        onNextPage={() => setPage((value) => Math.min(totalPages, value + 1))}
        onPageChange={setPage}
        onPreviousPage={() => setPage((value) => Math.max(1, value - 1))}
        onRowsPerPageChange={(value) => {
          setRowsPerPage(value);
          setPage(1);
        }}
      />
      <TenantUserForm
        {...(saveError instanceof Error ? { error: saveError.message } : {})}
        loading={
          mutations.create.isPending ||
          mutations.update.isPending ||
          userRoleMutations.create.isPending ||
          userRoleMutations.activate.isPending
        }
        onCancel={() => setEditing(undefined)}
        onSubmit={(value, access) => void save(value, access)}
        onVerify={verifyFrappe}
        open={editing !== undefined}
        record={editing ?? null}
        roleOptions={(userRoleLookups.data?.second ?? [])
          .filter((role) => role.status === "active")
          .map((role) => ({ id: role.id, key: role.key, label: role.label }))}
        selectedAccess={selectedAccess}
        verifying={mutations.verifyFrappe.isPending}
      />
      <UserActionDialog
        action={pendingAction}
        loading={
          mutations.activate.isPending ||
          mutations.deactivate.isPending ||
          mutations.forceDelete.isPending
        }
        onCancel={() => setPendingAction(null)}
        onConfirm={() => pendingAction && void act(pendingAction)}
      />
    </WorkspacePage>
  );
}
function UserActionDialog({
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
          <AlertDialogTitle>{verb} user?</AlertDialogTitle>
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
