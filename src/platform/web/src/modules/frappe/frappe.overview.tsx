import { KeyRoundIcon, PlugZapIcon, RefreshCwIcon, UserRoundIcon } from "lucide-react";
import { toast } from "@codexsun/ui/components/sonner";
import { Button } from "@codexsun/ui/components/button";
import { Card, CardContent } from "@codexsun/ui/components/card";
import { Skeleton } from "@codexsun/ui/components/skeleton";
import { cn } from "@codexsun/ui/lib/utils";
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

export function FrappeOverview({
  canUpdate,
  signedInUser
}: {
  canUpdate: boolean;
  signedInUser: { email: string; name: string };
}) {
  const query = useFrappeConnectionQuery();
  const mutation = useFrappeConnectionMutation();
  const verification = useFrappeConnectionVerificationMutation();
  const status = verification.isPending
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
    <section className="space-y-4">
      <div className="relative isolate overflow-hidden rounded-lg border bg-slate-950 px-6 py-4 text-white shadow-sm md:px-10 md:py-5">
        <div className="absolute inset-0 -z-20 bg-gradient-to-br from-slate-950 via-violet-950 to-indigo-900" />
        <div className="absolute -right-16 -top-20 -z-10 size-64 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-medium">
              <PlugZapIcon className="size-3.5" />
              Frappe integration
            </div>
            <h1 className="text-xl font-semibold tracking-tight">
              Connect TechMedia with your Frappe CRM.
            </h1>
            <p className="mt-2 text-sm leading-5 text-slate-200">
              Save the application connection, then verify it against the live server.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium shadow-sm lg:justify-self-end">
            <UserRoundIcon className="size-4" />
            Signed in as {signedInUser.name} · {signedInUser.email}
          </div>
        </div>
      </div>
      <Card className="shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <KeyRoundIcon className="size-5" />
            </span>
            <div>
              <p className="font-semibold">Saved connection state</p>
              {query.isLoading ? (
                <Skeleton className="mt-2 h-4 w-56" />
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  {query.data
                    ? `${query.data.connectionName} · ${query.data.baseUrl}`
                    : "Configure the Frappe connection below."}
                </p>
              )}
              {query.data?.lastCheckedAt ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Last checked {new Date(query.data.lastCheckedAt).toLocaleString()}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <WorkspaceStatusBadge
              label={query.data ? (query.data.enabled ? "Enabled" : "Disabled") : "Not configured"}
              tone={query.data?.enabled ? "success" : query.data ? "warning" : "neutral"}
            />
            <WorkspaceStatusBadge
              label={verificationLabel(status)}
              tone={verificationTone(status)}
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
        </CardContent>
      </Card>
      {query.isError ? (
        <WorkspaceFormBanner title="Frappe settings could not be loaded">
          {query.error instanceof Error ? query.error.message : "Please try again."}
        </WorkspaceFormBanner>
      ) : query.isLoading ? (
        <Card className="p-5 shadow-sm">
          <Skeleton className="h-5 w-48" />
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        </Card>
      ) : (
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
      )}
    </section>
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
