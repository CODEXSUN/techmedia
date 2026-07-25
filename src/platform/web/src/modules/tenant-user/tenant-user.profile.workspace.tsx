import { GlobalLoader } from "@codexsun/ui/components/global-loader";
import { toast } from "@codexsun/ui/components/sonner";
import { WorkspaceUpsertPage } from "@codexsun/ui/workspace/upsert";
import { useTenantUserProfileMutation, useTenantUserProfileQuery } from "./tenant-user.hooks";
import { TenantUserProfileForm } from "./tenant-user.profile.form";

export function TenantUserProfileWorkspace() {
  const query = useTenantUserProfileQuery();
  const update = useTenantUserProfileMutation();
  if (query.isLoading) return <GlobalLoader />;
  if (!query.data)
    return (
      <WorkspaceUpsertPage
        title="User Profile"
        description="Manage your account identity and security."
      >
        <div className="rounded-md border bg-card p-5 text-sm text-destructive">
          {query.error instanceof Error ? query.error.message : "Unable to load the user profile."}
        </div>
      </WorkspaceUpsertPage>
    );
  return (
    <WorkspaceUpsertPage
      title="User Profile"
      description="Update your identity, avatar, email, and password from one page."
    >
      <TenantUserProfileForm
        key={`${query.data.email}:${query.data.avatarUrl}`}
        profile={query.data}
        loading={update.isPending}
        {...(update.error instanceof Error ? { error: update.error.message } : {})}
        onSubmit={(payload, avatar) =>
          update.mutate(
            { avatar, payload },
            {
              onSuccess: () => toast.success("Profile updated"),
              onError: (error) =>
                toast.error("Unable to update profile", { description: error.message })
            }
          )
        }
      />
    </WorkspaceUpsertPage>
  );
}
