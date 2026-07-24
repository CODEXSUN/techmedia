import { useEffect, useState } from "react";
import { KeyRoundIcon, PlugZapIcon, SaveIcon } from "lucide-react";
import { Button } from "@codexsun/ui/components/button";
import { Input } from "@codexsun/ui/components/input";
import { WorkspaceSwitchCard } from "@codexsun/ui/workspace/status";
import {
  WorkspaceFormActions,
  WorkspaceFormBanner,
  WorkspaceFormBody,
  WorkspaceFormField,
  WorkspaceFormGrid,
  WorkspaceFormSurface
} from "@codexsun/ui/workspace/upsert";
import { frappeConnectionSchema, frappeConnectionVerificationSchema } from "./frappe.schema";
import type {
  FrappeConnectionSavePayload,
  FrappeConnectionSettings,
  FrappeConnectionVerificationPayload
} from "./frappe.types";

type FormValue = {
  appKey: string;
  appSecret: string;
  baseUrl: string;
  connectionName: string;
  enabled: boolean;
};

export function FrappeForm({
  canUpdate,
  error,
  loading,
  onSubmit,
  onVerify,
  settings,
  verificationError,
  verifying
}: {
  canUpdate: boolean;
  error?: string;
  loading: boolean;
  onSubmit: (value: FrappeConnectionSavePayload) => void;
  onVerify: (value: FrappeConnectionVerificationPayload) => void;
  settings: FrappeConnectionSettings | null;
  verificationError?: string;
  verifying: boolean;
}) {
  const [value, setValue] = useState<FormValue>(() => valueFor(settings));
  const [validationError, setValidationError] = useState("");
  const [validationTitle, setValidationTitle] = useState("Unable to save connection");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => setValue(valueFor(settings)), [settings]);

  function submit() {
    const parsed = frappeConnectionSchema.safeParse(value);
    const nextErrors: Record<string, string> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "");
        if (field && !nextErrors[field]) nextErrors[field] = issue.message;
      }
    }
    if (!parsed.success || Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      setValidationError(Object.values(nextErrors)[0] ?? "Check the connection details.");
      setValidationTitle("Unable to save connection");
      return;
    }
    setFieldErrors({});
    setValidationError("");
    onSubmit({
      ...(parsed.data.appKey ? { appKey: parsed.data.appKey } : {}),
      ...(parsed.data.appSecret ? { appSecret: parsed.data.appSecret } : {}),
      baseUrl: parsed.data.baseUrl,
      connectionName: parsed.data.connectionName,
      enabled: parsed.data.enabled
    });
  }

  function verify() {
    const parsed = frappeConnectionVerificationSchema.safeParse({
      appKey: value.appKey,
      appSecret: value.appSecret,
      baseUrl: value.baseUrl
    });
    const nextErrors: Record<string, string> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "");
        if (field && !nextErrors[field]) nextErrors[field] = issue.message;
      }
    }
    if (!parsed.success || Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      setValidationError(Object.values(nextErrors)[0] ?? "Check the connection details.");
      setValidationTitle("Unable to verify connection");
      return;
    }
    setFieldErrors({});
    setValidationError("");
    onVerify({
      ...(parsed.data.appKey ? { appKey: parsed.data.appKey } : {}),
      ...(parsed.data.appSecret ? { appSecret: parsed.data.appSecret } : {}),
      baseUrl: parsed.data.baseUrl
    });
  }

  const shownError = validationError || verificationError || error;
  const shownErrorTitle = validationError
    ? validationTitle
    : verificationError
      ? "Unable to verify connection"
      : "Unable to save connection";
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <WorkspaceFormSurface>
        <WorkspaceFormBody>
          {shownError ? (
            <WorkspaceFormBanner title={shownErrorTitle}>{shownError}</WorkspaceFormBanner>
          ) : null}
          <div className="mb-5 flex items-start gap-3 rounded-md border bg-muted/25 p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <KeyRoundIcon className="size-5" />
            </span>
            <div>
              <p className="text-sm font-medium">Tenant app authentication</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Save an encrypted app key and secret for connection testing. Individual user
                credentials remain configured from the Users page.
              </p>
            </div>
          </div>
          <WorkspaceFormGrid>
            <WorkspaceFormField label="Connection name" required>
              <Input
                aria-invalid={Boolean(fieldErrors.connectionName)}
                className={fieldErrors.connectionName ? "border-destructive" : undefined}
                disabled={!canUpdate || loading || verifying}
                maxLength={160}
                placeholder="Primary Frappe CRM"
                value={value.connectionName}
                onChange={(event) =>
                  setValue((current) => ({ ...current, connectionName: event.target.value }))
                }
              />
              <FieldError message={fieldErrors.connectionName} />
            </WorkspaceFormField>
            <WorkspaceFormField label="Frappe URL" required>
              <Input
                aria-invalid={Boolean(fieldErrors.baseUrl)}
                className={fieldErrors.baseUrl ? "border-destructive" : undefined}
                disabled={!canUpdate || loading || verifying}
                inputMode="url"
                maxLength={500}
                placeholder="https://crm.example.com"
                value={value.baseUrl}
                onChange={(event) =>
                  setValue((current) => ({ ...current, baseUrl: event.target.value }))
                }
              />
              <FieldError message={fieldErrors.baseUrl} />
            </WorkspaceFormField>
            <WorkspaceFormField
              label="Frappe app key"
              required={!settings?.appKeyConfigured && Boolean(value.appSecret)}
            >
              <Input
                aria-invalid={Boolean(fieldErrors.appKey)}
                autoComplete="off"
                className={fieldErrors.appKey ? "border-destructive" : undefined}
                disabled={!canUpdate || loading || verifying}
                maxLength={2_000}
                placeholder={
                  settings?.appKeyConfigured
                    ? "Configured — leave blank to keep"
                    : "Enter the Frappe app key"
                }
                type="password"
                value={value.appKey}
                onChange={(event) =>
                  setValue((current) => ({ ...current, appKey: event.target.value }))
                }
              />
              <FieldError message={fieldErrors.appKey} />
            </WorkspaceFormField>
            <WorkspaceFormField
              label="Frappe app secret"
              required={!settings?.appSecretConfigured && Boolean(value.appKey)}
            >
              <Input
                aria-invalid={Boolean(fieldErrors.appSecret)}
                autoComplete="new-password"
                className={fieldErrors.appSecret ? "border-destructive" : undefined}
                disabled={!canUpdate || loading || verifying}
                maxLength={2_000}
                placeholder={
                  settings?.appSecretConfigured
                    ? "Configured — leave blank to keep"
                    : "Enter the Frappe app secret"
                }
                type="password"
                value={value.appSecret}
                onChange={(event) =>
                  setValue((current) => ({ ...current, appSecret: event.target.value }))
                }
              />
              <FieldError message={fieldErrors.appSecret} />
            </WorkspaceFormField>
            <WorkspaceSwitchCard
              activeLabel="Connection enabled"
              ariaLabel="Enable Frappe connection"
              checked={value.enabled}
              className="md:col-span-2"
              description="Enquiry pull and push actions use this connection only while it is enabled."
              disabled={!canUpdate || loading || verifying}
              fieldLabel="Connection status"
              inactiveLabel="Connection disabled"
              onCheckedChange={(enabled) => setValue((current) => ({ ...current, enabled }))}
            />
          </WorkspaceFormGrid>
        </WorkspaceFormBody>
        {canUpdate ? (
          <WorkspaceFormActions>
            <Button
              disabled={loading || verifying}
              onClick={verify}
              type="button"
              variant="outline"
            >
              <PlugZapIcon className="size-4" />
              {verifying ? "Verifying…" : "Verify connection"}
            </Button>
            <Button disabled={loading || verifying} type="submit">
              <SaveIcon className="size-4" />
              {loading ? "Saving…" : settings ? "Update connection" : "Save connection"}
            </Button>
          </WorkspaceFormActions>
        ) : null}
      </WorkspaceFormSurface>
    </form>
  );
}

function valueFor(settings: FrappeConnectionSettings | null): FormValue {
  return {
    appKey: "",
    appSecret: "",
    baseUrl: settings?.baseUrl ?? "",
    connectionName: settings?.connectionName ?? "",
    enabled: settings?.enabled ?? false
  };
}

function FieldError({ message }: { message: string | undefined }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}
