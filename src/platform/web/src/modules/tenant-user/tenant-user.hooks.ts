import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateTenantUser,
  activateAdminTenantUser,
  createAdminTenantUser,
  createTenantUser,
  deactivateAdminTenantUser,
  deactivateTenantUser,
  forceDeleteAdminTenantUser,
  forceDeleteTenantUser,
  listAdminTenantUsers,
  listTenantUserTenants,
  listTenantUsers,
  updateAdminTenantUser,
  updateTenantUser,
  verifyTenantUserFrappeCredentials
} from "./tenant-user.services";
import {
  getTenantUserProfile,
  updateTenantUserProfile,
  uploadTenantUserAvatar
} from "./tenant-user.services";
import type { TenantUserProfileSavePayload } from "./tenant-user.types";
import type { TenantUser, TenantUserSavePayload } from "./tenant-user.types";
export const tenantUserQueryKey = ["tenant", "access", "users"] as const;
export const tenantUserProfileQueryKey = ["tenant", "profile"] as const;
export function useTenantUserProfileQuery() {
  return useQuery({ queryFn: getTenantUserProfile, queryKey: tenantUserProfileQueryKey });
}
export function useTenantUserProfileMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      avatar,
      payload
    }: {
      avatar: File | null;
      payload: TenantUserProfileSavePayload;
    }) => {
      const profile = await updateTenantUserProfile(payload);
      if (avatar) await uploadTenantUserAvatar(avatar);
      return profile;
    },
    onSettled: () => client.invalidateQueries({ queryKey: tenantUserProfileQueryKey })
  });
}
export function useTenantUsersQuery() {
  return useQuery({ queryFn: () => listTenantUsers(), queryKey: tenantUserQueryKey });
}

export const adminTenantUserTenantQueryKey = ["sa", "tenant-users", "tenants"] as const;

export function useTenantUserTenantsQuery() {
  return useQuery({ queryFn: listTenantUserTenants, queryKey: adminTenantUserTenantQueryKey });
}

export function useAdminTenantUsersQuery(tenantId: number) {
  return useQuery({
    enabled: tenantId > 0,
    queryFn: () => listAdminTenantUsers(tenantId),
    queryKey: ["sa", "tenant-users", tenantId]
  });
}

export function useAdminTenantUserMutations(tenantId: number) {
  const client = useQueryClient();
  const queryKey = ["sa", "tenant-users", tenantId] as const;
  const done = () => client.invalidateQueries({ queryKey });
  return {
    activate: useMutation({
      mutationFn: (record: TenantUser) => activateAdminTenantUser(tenantId, record.id),
      onSuccess: done
    }),
    create: useMutation({
      mutationFn: (payload: TenantUserSavePayload) => createAdminTenantUser(tenantId, payload),
      onSuccess: done
    }),
    deactivate: useMutation({
      mutationFn: (record: TenantUser) => deactivateAdminTenantUser(tenantId, record.id),
      onSuccess: done
    }),
    forceDelete: useMutation({
      mutationFn: (record: TenantUser) => forceDeleteAdminTenantUser(tenantId, record.id),
      onSuccess: done
    }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: TenantUserSavePayload }) =>
        updateAdminTenantUser(tenantId, id, payload),
      onSuccess: done
    })
  };
}
export function useTenantUserMutations() {
  const client = useQueryClient();
  const done = () => client.invalidateQueries({ queryKey: tenantUserQueryKey });
  return {
    activate: useMutation({
      mutationFn: (record: TenantUser) => activateTenantUser(record.id),
      onSuccess: done
    }),
    create: useMutation({ mutationFn: createTenantUser, onSuccess: done }),
    deactivate: useMutation({
      mutationFn: (record: TenantUser) => deactivateTenantUser(record.id),
      onSuccess: done
    }),
    forceDelete: useMutation({
      mutationFn: (record: TenantUser) => forceDeleteTenantUser(record.id),
      onSuccess: done
    }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: TenantUserSavePayload }) =>
        updateTenantUser(id, payload),
      onSuccess: done
    }),
    verifyFrappe: useMutation({
      mutationFn: (record: TenantUser) => verifyTenantUserFrappeCredentials(record.id),
      onSuccess: done
    })
  };
}
