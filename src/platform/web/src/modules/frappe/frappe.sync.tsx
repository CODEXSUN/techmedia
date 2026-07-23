import { useEffect, useState } from "react";
import { ArrowDownToLineIcon, ArrowUpFromLineIcon, SaveIcon } from "lucide-react";
import { Button } from "@codexsun/ui/components/button";
import { toast } from "@codexsun/ui/components/sonner";
import { WorkspaceSwitchCard } from "@codexsun/ui/workspace/status";
import {
  WorkspaceFormActions,
  WorkspaceFormBanner,
  WorkspaceFormBody,
  WorkspaceFormGrid,
  WorkspaceFormSurface
} from "@codexsun/ui/workspace/upsert";
import {
  useFrappeSyncMutation,
  useFrappeSyncSettingsMutation,
  useFrappeSyncSettingsQuery
} from "./frappe.hooks";

const fieldMap = [
  ["Enquiry ID", "name", "External link"],
  ["Title", "enquiry_details", "Two-way"],
  ["Mobile", "mobile", "Two-way"],
  ["Customer", "customer", "Two-way"],
  ["List in", "group", "Two-way"],
  ["Assigned to", "assigned_to_employee", "Email to Employee"],
  ["Enquiry date", "date", "Pull"],
  ["Status", "status", "Two-way"],
  ["Workspace notes", "status_details", "Two-way"],
  ["Messages", "enquiry_messages.comment", "Two-way"]
] as const;

export function FrappeSyncPanel({ canUpdate }: { canUpdate: boolean }) {
  const query = useFrappeSyncSettingsQuery();
  const saveMutation = useFrappeSyncSettingsMutation();
  const syncMutation = useFrappeSyncMutation();
  const [pullEnabled, setPullEnabled] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    setPullEnabled(query.data?.pullEnquiriesEnabled ?? false);
    setPushEnabled(query.data?.pushEnquiriesEnabled ?? false);
  }, [query.data]);

  async function save() {
    try {
      await saveMutation.mutateAsync({
        pullEnquiriesEnabled: pullEnabled,
        pushEnquiriesEnabled: pushEnabled
      });
      toast.success("Enquiry sync settings saved");
    } catch {}
  }

  async function run(direction: "pull" | "push") {
    try {
      await saveMutation.mutateAsync({
        pullEnquiriesEnabled: pullEnabled,
        pushEnquiriesEnabled: pushEnabled
      });
      const result = await syncMutation.mutateAsync(direction);
      toast.success(`${direction === "pull" ? "Pull" : "Push"} sync completed`, {
        description: `${result.created} created, ${result.updated} updated, ${result.failed} failed.`
      });
    } catch {}
  }

  const error =
    query.error instanceof Error
      ? query.error.message
      : saveMutation.error instanceof Error
        ? saveMutation.error.message
        : syncMutation.error instanceof Error
          ? syncMutation.error.message
          : "";
  return (
    <div className="mt-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold">Enquiry directional sync</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose either direction independently, or enable both for bidirectional sync.
        </p>
      </div>
      <WorkspaceFormSurface>
        <WorkspaceFormBody>
          {error ? (
            <WorkspaceFormBanner title="Enquiry sync could not be completed">
              {error}
            </WorkspaceFormBanner>
          ) : null}
          <WorkspaceFormGrid>
            <WorkspaceSwitchCard
              activeLabel="Pull enabled"
              ariaLabel="Pull enquiries from Frappe"
              checked={pullEnabled}
              description="Create or update TechMedia CRM enquiries from the live Frappe Enquiry table."
              disabled={!canUpdate || query.isLoading || saveMutation.isPending}
              fieldLabel="Frappe to TechMedia"
              inactiveLabel="Pull disabled"
              onCheckedChange={setPullEnabled}
            />
            <WorkspaceSwitchCard
              activeLabel="Push enabled"
              ariaLabel="Push enquiries to Frappe"
              checked={pushEnabled}
              description="Create or update live Frappe Enquiry records from TechMedia CRM."
              disabled={!canUpdate || query.isLoading || saveMutation.isPending}
              fieldLabel="TechMedia to Frappe"
              inactiveLabel="Push disabled"
              onCheckedChange={setPushEnabled}
            />
          </WorkspaceFormGrid>
          <div className="mt-5 overflow-hidden rounded-md border">
            <div className="grid grid-cols-[1fr_1fr_140px] bg-muted/50 px-3 py-2 text-xs font-medium">
              <span>TechMedia field</span>
              <span>Frappe field</span>
              <span>Mapping</span>
            </div>
            {fieldMap.map(([local, remote, direction]) => (
              <div
                className="grid grid-cols-[1fr_1fr_140px] border-t px-3 py-2 text-sm"
                key={remote}
              >
                <span>{local}</span>
                <code className="text-xs text-muted-foreground">{remote}</code>
                <span className="text-xs text-muted-foreground">{direction}</span>
              </div>
            ))}
          </div>
        </WorkspaceFormBody>
        {canUpdate ? (
          <WorkspaceFormActions>
            <Button
              disabled={!pullEnabled || syncMutation.isPending || saveMutation.isPending}
              onClick={() => void run("pull")}
              type="button"
              variant="outline"
            >
              <ArrowDownToLineIcon className="size-4" />
              Pull enquiries
            </Button>
            <Button
              disabled={!pushEnabled || syncMutation.isPending || saveMutation.isPending}
              onClick={() => void run("push")}
              type="button"
              variant="outline"
            >
              <ArrowUpFromLineIcon className="size-4" />
              Push enquiries
            </Button>
            <Button
              disabled={saveMutation.isPending || syncMutation.isPending}
              onClick={() => void save()}
              type="button"
            >
              <SaveIcon className="size-4" />
              Save sync settings
            </Button>
          </WorkspaceFormActions>
        ) : null}
      </WorkspaceFormSurface>
    </div>
  );
}
