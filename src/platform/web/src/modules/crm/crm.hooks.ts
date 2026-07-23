import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCrmEnquiry,
  forceDeleteCrmEnquiry,
  getCrmEnquiryOverview,
  listCrmEnquiries,
  listCrmEnquiryReferences,
  listCrmUserReferences,
  restoreCrmEnquiry,
  suspendCrmEnquiry,
  updateCrmEnquiry
} from "./crm.services";
import type { CrmEnquiry, CrmEnquirySavePayload, CrmEnquiryView } from "./crm.types";

export const crmEnquiryQueryKey = ["tenant", "crm", "enquiries"] as const;

export function useCrmOverviewQuery() {
  return useQuery({
    queryFn: getCrmEnquiryOverview,
    queryKey: [...crmEnquiryQueryKey, "overview"]
  });
}

export function useCrmEnquiriesQuery(input: {
  enquiryId?: number;
  search?: string;
  view: CrmEnquiryView;
}) {
  return useQuery({
    queryFn: () => listCrmEnquiries(input),
    queryKey: [...crmEnquiryQueryKey, input.view, input.search ?? "", input.enquiryId ?? 0]
  });
}

export function useCrmReferencesQuery() {
  return useQuery({
    queryFn: listCrmEnquiryReferences,
    queryKey: [...crmEnquiryQueryKey, "references"]
  });
}

export function useCrmUsersQuery() {
  return useQuery({
    queryFn: listCrmUserReferences,
    queryKey: [...crmEnquiryQueryKey, "users"]
  });
}

export function useCrmEnquiryMutations() {
  const client = useQueryClient();
  const done = () => client.invalidateQueries({ queryKey: crmEnquiryQueryKey });
  return {
    create: useMutation({ mutationFn: createCrmEnquiry, onSuccess: done }),
    forceDelete: useMutation({
      mutationFn: (record: CrmEnquiry) => forceDeleteCrmEnquiry(record.id),
      onSuccess: done
    }),
    restore: useMutation({
      mutationFn: (record: CrmEnquiry) => restoreCrmEnquiry(record.id),
      onSuccess: done
    }),
    suspend: useMutation({
      mutationFn: (record: CrmEnquiry) => suspendCrmEnquiry(record.id),
      onSuccess: done
    }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: CrmEnquirySavePayload }) =>
        updateCrmEnquiry(id, payload),
      onSuccess: done
    })
  };
}
