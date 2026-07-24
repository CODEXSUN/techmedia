import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getFrappeConnectionSettings,
  getFrappeSyncSettings,
  importFrappeUser,
  previewFrappeUsers,
  runFrappeEnquirySync,
  saveFrappeConnectionSettings,
  saveFrappeSyncSettings,
  verifyFrappeConnection
} from "./frappe.services";

export const frappeConnectionQueryKey = ["tenant", "frappe", "connection"] as const;
export const frappeSyncQueryKey = ["tenant", "frappe", "enquiry-sync"] as const;
export const frappeUserPreviewQueryKey = ["tenant", "frappe", "user-sync", "preview"] as const;

export function useFrappeConnectionQuery() {
  return useQuery({
    queryFn: getFrappeConnectionSettings,
    queryKey: frappeConnectionQueryKey
  });
}

export function useFrappeSyncSettingsQuery() {
  return useQuery({ queryFn: getFrappeSyncSettings, queryKey: frappeSyncQueryKey });
}

export function useFrappeSyncSettingsMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: saveFrappeSyncSettings,
    onSuccess: (record) => client.setQueryData(frappeSyncQueryKey, record)
  });
}

export function useFrappeSyncMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: runFrappeEnquirySync,
    onSettled: () => {
      void client.invalidateQueries({ queryKey: frappeSyncQueryKey });
      void client.invalidateQueries({ queryKey: ["tenant", "crm", "enquiries"] });
    }
  });
}

export function useFrappeConnectionMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: saveFrappeConnectionSettings,
    onSuccess: (record) => client.setQueryData(frappeConnectionQueryKey, record)
  });
}

export function useFrappeConnectionVerificationMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: verifyFrappeConnection,
    onSettled: () => client.invalidateQueries({ queryKey: frappeConnectionQueryKey })
  });
}

export function useFrappeUserPreviewQuery() {
  return useQuery({
    queryFn: previewFrappeUsers,
    queryKey: frappeUserPreviewQueryKey
  });
}

export function useFrappeUserImportMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: importFrappeUser,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: frappeUserPreviewQueryKey });
      void client.invalidateQueries({ queryKey: ["tenant", "access", "users"] });
    }
  });
}
