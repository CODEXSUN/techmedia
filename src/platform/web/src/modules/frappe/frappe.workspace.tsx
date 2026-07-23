import { RefreshCwIcon } from "lucide-react";
import { toast } from "@codexsun/ui/components/sonner";
import { Button } from "@codexsun/ui/components/button";
import { Skeleton } from "@codexsun/ui/components/skeleton";
import { cn } from "@codexsun/ui/lib/utils";
import { WorkspacePage } from "@codexsun/ui/workspace/page";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import { WorkspaceFormBanner } from "@codexsun/ui/workspace/upsert";
import { FrappeForm } from "./frappe.form";
import {
  useFrappeConnectionMutation,
  useFrappeConnectionQuery,
  useFrappeConnectionVerificationMutation
} from "./frappe.hooks";
import type {
  FrappeConnectionSavePayload,
  FrappeConnectionVerificationPayload
} from "./frappe.types";
import { FrappeSyncPanel } from "./frappe.sync";

export function FrappeWorkspace({ canUpdate }: { canUpdate: boolean }) {
  const query = useFrappeConnectionQuery();
  const mutation = useFrappeConnectionMutation();
  const verification = useFrappeConnectionVerificationMutation();
  const verificationStatus = verification.isPending
    ? "checking"
    : verification.isSuccess
      ? "live"
      : verification.isError
        ? "offline"
        : query.data?.verificationStatus;

  async function save(value: FrappeConnectionSavePayload) {
    try {
      const record = await mutation.mutateAsync(value);
      toast.success("Frappe connection saved", {
        description: `${record.connectionName} is ${record.enabled ? "enabled" : "disabled"}.`
      });
    } catch {}
  }

  async function verify(value: FrappeConnectionVerificationPayload) {
    try {
      const result = await verification.mutateAsync(value);
      toast.success("Frappe connection verified", {
        description: `Connected as ${result.authenticatedUser} in ${result.latencyMs} ms.`
      });
    } catch {}
  }

  return (
    <WorkspacePage
      actions={
        <div className="flex items-center gap-2">
          <WorkspaceStatusBadge
            label={verificationLabel(verificationStatus)}
            tone={verificationTone(verificationStatus)}
          />
          <WorkspaceStatusBadge
            label={query.data ? (query.data.enabled ? "Enabled" : "Disabled") : "Not configured"}
            tone={query.data?.enabled ? "success" : query.data ? "warning" : "neutral"}
          />
          <Button
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
            type="button"
            variant="outline"
          >
            <RefreshCwIcon className={cn("size-4", query.isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>
      }
      description="Store the tenant Frappe CRM endpoint and encrypted API credentials."
      technicalName="page.frappe.settings"
      title="Frappe settings"
    >
      {query.isLoading ? (
        <div className="rounded-md border bg-card p-5 shadow-sm">
          <Skeleton className="h-5 w-48" />
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        </div>
      ) : query.isError ? (
        <WorkspaceFormBanner title="Frappe settings could not be loaded">
          {query.error instanceof Error ? query.error.message : "Please try again."}
        </WorkspaceFormBanner>
      ) : (
        <>
          <FrappeForm
            canUpdate={canUpdate}
            {...(mutation.error instanceof Error ? { error: mutation.error.message } : {})}
            loading={mutation.isPending}
            onSubmit={(value) => void save(value)}
            onVerify={(value) => void verify(value)}
            settings={query.data ?? null}
            {...(verification.error instanceof Error
              ? { verificationError: verification.error.message }
              : {})}
            verifying={verification.isPending}
          />
          <FrappeSyncPanel canUpdate={canUpdate} />
        </>
      )}
    </WorkspacePage>
  );
}

function verificationLabel(status: "checking" | "live" | "offline" | "unverified" | undefined) {
  if (status === "checking") return "Checking connection";
  if (status === "live") return "Verified · Live";
  if (status === "offline") return "Verified · Offline";
  return status === "unverified" ? "Not verified" : "Not configured";
}

function verificationTone(status: "checking" | "live" | "offline" | "unverified" | undefined) {
  if (status === "live") return "success" as const;
  if (status === "offline") return "danger" as const;
  if (status === "checking") return "info" as const;
  return status === "unverified" ? ("warning" as const) : ("neutral" as const);
}
