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
  apiKey: string;
  apiSecret: string;
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
    if (!settings?.apiKeyConfigured && !value.apiKey.trim()) {
      nextErrors.apiKey = "API key is required for the first connection.";
    }
    if (!settings?.apiSecretConfigured && !value.apiSecret.trim()) {
      nextErrors.apiSecret = "API secret is required for the first connection.";
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
      baseUrl: parsed.data.baseUrl,
      connectionName: parsed.data.connectionName,
      enabled: parsed.data.enabled,
      ...(parsed.data.apiKey ? { apiKey: parsed.data.apiKey } : {}),
      ...(parsed.data.apiSecret ? { apiSecret: parsed.data.apiSecret } : {})
    });
  }

  function verify() {
    const parsed = frappeConnectionVerificationSchema.safeParse({
      apiKey: value.apiKey,
      apiSecret: value.apiSecret,
      baseUrl: value.baseUrl
    });
    const nextErrors: Record<string, string> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "");
        if (field && !nextErrors[field]) nextErrors[field] = issue.message;
      }
    }
    if (!settings?.apiKeyConfigured && !value.apiKey.trim()) {
      nextErrors.apiKey = "API key is required to verify this connection.";
    }
    if (!settings?.apiSecretConfigured && !value.apiSecret.trim()) {
      nextErrors.apiSecret = "API secret is required to verify this connection.";
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
      baseUrl: parsed.data.baseUrl,
      ...(parsed.data.apiKey ? { apiKey: parsed.data.apiKey } : {}),
      ...(parsed.data.apiSecret ? { apiSecret: parsed.data.apiSecret } : {})
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
              <p className="text-sm font-medium">Encrypted credentials</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                API credentials are encrypted before database storage and are never returned to this
                page.
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
            <WorkspaceFormField label="API key" required={!settings?.apiKeyConfigured}>
              <Input
                aria-invalid={Boolean(fieldErrors.apiKey)}
                autoComplete="off"
                className={fieldErrors.apiKey ? "border-destructive" : undefined}
                disabled={!canUpdate || loading || verifying}
                maxLength={2_000}
                placeholder={
                  settings?.apiKeyConfigured
                    ? "Configured — leave blank to keep"
                    : "Enter Frappe API key"
                }
                type="password"
                value={value.apiKey}
                onChange={(event) =>
                  setValue((current) => ({ ...current, apiKey: event.target.value }))
                }
              />
              <FieldError message={fieldErrors.apiKey} />
            </WorkspaceFormField>
            <WorkspaceFormField label="API secret" required={!settings?.apiSecretConfigured}>
              <Input
                aria-invalid={Boolean(fieldErrors.apiSecret)}
                autoComplete="new-password"
                className={fieldErrors.apiSecret ? "border-destructive" : undefined}
                disabled={!canUpdate || loading || verifying}
                maxLength={2_000}
                placeholder={
                  settings?.apiSecretConfigured
                    ? "Configured — leave blank to keep"
                    : "Enter Frappe API secret"
                }
                type="password"
                value={value.apiSecret}
                onChange={(event) =>
                  setValue((current) => ({ ...current, apiSecret: event.target.value }))
                }
              />
              <FieldError message={fieldErrors.apiSecret} />
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
    apiKey: "",
    apiSecret: "",
    baseUrl: settings?.baseUrl ?? "",
    connectionName: settings?.connectionName ?? "",
    enabled: settings?.enabled ?? false
  };
}

function FieldError({ message }: { message: string | undefined }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}
