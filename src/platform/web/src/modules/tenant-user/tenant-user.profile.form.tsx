import { useEffect, useRef, useState } from "react";
import { CameraIcon, SaveIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@codexsun/ui/components/avatar";
import { Button } from "@codexsun/ui/components/button";
import { Input } from "@codexsun/ui/components/input";
import {
  WorkspaceFormActions,
  WorkspaceFormBanner,
  WorkspaceFormBody,
  WorkspaceFormField,
  WorkspaceFormGrid,
  WorkspaceFormSurface
} from "@codexsun/ui/workspace/upsert";
import { tenantUserProfileSchema } from "./tenant-user.schema";
import type {
  TenantUserProfile,
  TenantUserProfileFormValue,
  TenantUserProfileSavePayload
} from "./tenant-user.types";

export function TenantUserProfileForm({
  error,
  loading,
  onSubmit,
  profile
}: {
  error?: string;
  loading: boolean;
  onSubmit: (payload: TenantUserProfileSavePayload, avatar: File | null) => void;
  profile: TenantUserProfile;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(profile.avatarUrl);
  const [validationError, setValidationError] = useState("");
  const [value, setValue] = useState<TenantUserProfileFormValue>({
    confirmPassword: "",
    email: profile.email,
    name: profile.name,
    password: ""
  });
  useEffect(() => {
    if (!avatar) setAvatarPreview(profile.avatarUrl);
  }, [avatar, profile.avatarUrl]);

  useEffect(
    () => () => {
      if (avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    },
    [avatarPreview]
  );
  function selectAvatar(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setValidationError("Select a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > 1024 * 1024) {
      setValidationError("Avatar images must be 1 MB or smaller.");
      return;
    }
    setValidationError("");
    setAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  }
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = tenantUserProfileSchema.safeParse(value);
        if (!parsed.success) {
          setValidationError(parsed.error.issues[0]?.message ?? "Check the profile details.");
          return;
        }
        setValidationError("");
        const { confirmPassword: _confirmPassword, password, ...identity } = parsed.data;
        onSubmit(password ? { ...identity, password } : identity, avatar);
      }}
    >
      <WorkspaceFormSurface>
        <WorkspaceFormBody>
          {validationError || error ? (
            <WorkspaceFormBanner title="Unable to update profile">
              {validationError || error}
            </WorkspaceFormBanner>
          ) : null}
          <div className="mb-6 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center">
            <Avatar className="size-24 border bg-muted">
              <AvatarImage alt={profile.name} src={avatarPreview} />
              <AvatarFallback className="text-xl">{initials(value.name)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold">Profile avatar</h2>
              <p className="mt-1 text-sm text-muted-foreground">PNG, JPEG, or WebP up to 1 MB.</p>
              <input
                ref={inputRef}
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                type="file"
                onChange={(event) => {
                  selectAvatar(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <Button
                className="mt-3"
                type="button"
                variant="outline"
                onClick={() => inputRef.current?.click()}
              >
                <CameraIcon />
                Choose avatar
              </Button>
            </div>
          </div>
          <WorkspaceFormGrid columns={2}>
            <WorkspaceFormField label="User name" required>
              <Input
                value={value.name}
                onChange={(event) =>
                  setValue((current) => ({ ...current, name: event.target.value }))
                }
              />
            </WorkspaceFormField>
            <WorkspaceFormField label="Email" required>
              <Input
                type="email"
                value={value.email}
                onChange={(event) =>
                  setValue((current) => ({ ...current, email: event.target.value }))
                }
              />
            </WorkspaceFormField>
            <WorkspaceFormField label="New password">
              <Input
                autoComplete="new-password"
                minLength={8}
                type="password"
                value={value.password ?? ""}
                onChange={(event) =>
                  setValue((current) => ({ ...current, password: event.target.value }))
                }
              />
            </WorkspaceFormField>
            <WorkspaceFormField label="Confirm password">
              <Input
                autoComplete="new-password"
                minLength={8}
                type="password"
                value={value.confirmPassword}
                onChange={(event) =>
                  setValue((current) => ({ ...current, confirmPassword: event.target.value }))
                }
              />
            </WorkspaceFormField>
          </WorkspaceFormGrid>
        </WorkspaceFormBody>
        <WorkspaceFormActions>
          <Button disabled={loading} type="submit">
            <SaveIcon />
            {loading ? "Updating..." : "Update profile"}
          </Button>
        </WorkspaceFormActions>
      </WorkspaceFormSurface>
    </form>
  );
}
function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
}
