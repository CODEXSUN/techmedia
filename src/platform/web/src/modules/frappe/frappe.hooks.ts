import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getFrappeConnectionSettings,
  getFrappeSyncSettings,
  runFrappeEnquirySync,
  saveFrappeConnectionSettings,
  saveFrappeSyncSettings,
  verifyFrappeConnection
} from "./frappe.services";

export const frappeConnectionQueryKey = ["tenant", "frappe", "connection"] as const;
export const frappeSyncQueryKey = ["tenant", "frappe", "enquiry-sync"] as const;

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
