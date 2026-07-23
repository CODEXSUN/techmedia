import { KeyRoundIcon, PlugZapIcon, UserRoundIcon } from "lucide-react";
import { Card, CardContent } from "@codexsun/ui/components/card";
import { Skeleton } from "@codexsun/ui/components/skeleton";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import { useFrappeConnectionQuery } from "./frappe.hooks";

export function FrappeOverview({
  signedInUser
}: {
  signedInUser: { email: string; name: string };
}) {
  const query = useFrappeConnectionQuery();
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
              Configure one secure tenant connection now; sync workflows come next.
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
              <p className="font-semibold">Frappe connection</p>
              {query.isLoading ? (
                <Skeleton className="mt-2 h-4 w-56" />
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  {query.data
                    ? `${query.data.connectionName} · ${query.data.baseUrl}`
                    : "Open Settings to add the tenant connection details."}
                </p>
              )}
              {query.data?.lastCheckedAt ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Last checked {new Date(query.data.lastCheckedAt).toLocaleString()}
                </p>
              ) : null}
            </div>
          </div>
          {!query.isLoading ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {query.data ? (
                <WorkspaceStatusBadge
                  label={query.data.enabled ? "Enabled" : "Disabled"}
                  tone={query.data.enabled ? "success" : "neutral"}
                />
              ) : null}
              <WorkspaceStatusBadge
                label={verificationLabel(query.data?.verificationStatus)}
                tone={verificationTone(query.data?.verificationStatus)}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

function verificationLabel(status: "live" | "offline" | "unverified" | undefined) {
  if (status === "live") return "Verified · Live";
  if (status === "offline") return "Verified · Offline";
  return status === "unverified" ? "Not verified" : "Not configured";
}

function verificationTone(status: "live" | "offline" | "unverified" | undefined) {
  if (status === "live") return "success" as const;
  if (status === "offline") return "danger" as const;
  return status === "unverified" ? ("warning" as const) : ("neutral" as const);
}
