import { useState } from "react";
import { Save } from "lucide-react";
import { Input } from "@codexsun/ui/components/input";
import { WorkspaceSwitchCard } from "@codexsun/ui/workspace/status";
import {
  WorkspaceFormBanner,
  WorkspaceFormField,
  WorkspaceFormFooter,
  WorkspaceFormGrid,
  WorkspaceUpsertDialog
} from "@codexsun/ui/workspace/upsert";
import { tenantUserAdminSchema } from "./tenant-user.schema";
import type { TenantUser, TenantUserSavePayload } from "./tenant-user.types";

type FormValue = TenantUserSavePayload & { confirmPassword: string };
const emptyUser: FormValue = {
  confirmPassword: "",
  email: "",
  name: "",
  password: "",
  status: "active"
};

export function TenantUserAdminForm({
  error,
  loading,
  onCancel,
  onSubmit,
  open,
  record
}: {
  error?: string;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (value: TenantUserSavePayload) => void;
  open: boolean;
  record: TenantUser | null;
}) {
  return (
    <WorkspaceUpsertDialog
      description="Manage this user's identity, password, and account status for the selected tenant."
      onClose={onCancel}
      open={open}
      title={`${record ? "Edit" : "New"} tenant user`}
    >
      <TenantUserAdminFormBody
        key={`${record?.id ?? "new"}:${open}`}
        {...(error ? { error } : {})}
        initialValue={
          record
            ? {
                confirmPassword: "",
                email: record.email,
                name: record.name,
                password: "",
                status: record.status
              }
            : emptyUser
        }
        loading={loading}
        onCancel={onCancel}
        onSubmit={onSubmit}
        record={record}
      />
    </WorkspaceUpsertDialog>
  );
}

function TenantUserAdminFormBody({
  error,
  initialValue,
  loading,
  onCancel,
  onSubmit,
  record
}: {
  error?: string;
  initialValue: FormValue;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (value: TenantUserSavePayload) => void;
  record: TenantUser | null;
}) {
  const [value, setValue] = useState(initialValue);
  const [validationError, setValidationError] = useState("");
  const shownError = validationError || error;
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = tenantUserAdminSchema.safeParse(value);
        if (!parsed.success || (!record && !value.password)) {
          setValidationError(
            !record && !value.password
              ? "Password must contain at least 8 characters."
              : (parsed.error?.issues[0]?.message ?? "Check the user details.")
          );
          return;
        }
        setValidationError("");
        const { confirmPassword: _confirmPassword, password, ...payload } = parsed.data;
        onSubmit(password ? { ...payload, password } : payload);
      }}
    >
      {shownError ? (
        <WorkspaceFormBanner title="Unable to save">{shownError}</WorkspaceFormBanner>
      ) : null}
      <WorkspaceFormGrid columns={1}>
        <WorkspaceFormField label="User name" required>
          <Input
            autoFocus
            maxLength={180}
            required
            value={value.name}
            onChange={(event) => setValue((current) => ({ ...current, name: event.target.value }))}
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Email" required>
          <Input
            maxLength={180}
            required
            type="email"
            value={value.email}
            onChange={(event) => setValue((current) => ({ ...current, email: event.target.value }))}
          />
        </WorkspaceFormField>
        <WorkspaceFormField label={record ? "New password" : "Password"} required={!record}>
          <Input
            minLength={8}
            required={!record}
            type="password"
            value={value.password ?? ""}
            onChange={(event) =>
              setValue((current) => ({ ...current, password: event.target.value }))
            }
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Confirm password" required={!record || Boolean(value.password)}>
          <Input
            minLength={8}
            required={!record || Boolean(value.password)}
            type="password"
            value={value.confirmPassword}
            onChange={(event) =>
              setValue((current) => ({ ...current, confirmPassword: event.target.value }))
            }
          />
        </WorkspaceFormField>
        <WorkspaceSwitchCard
          ariaLabel="User active status"
          checked={value.status === "active"}
          fieldLabel="Status"
          onCheckedChange={(checked) =>
            setValue((current) => ({ ...current, status: checked ? "active" : "inactive" }))
          }
        />
      </WorkspaceFormGrid>
      <WorkspaceFormFooter
        className="mt-6 border-t pt-4"
        onCancel={onCancel}
        primaryLabel={record ? "Update user" : "Save user"}
        primaryLoading={loading}
        primaryProps={{
          children: (
            <>
              <Save className="size-4" />
              {record ? "Update user" : "Save user"}
            </>
          )
        }}
      />
    </form>
  );
}
