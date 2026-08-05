import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addCrmEnquiryAttachment,
  addCrmEnquiryCall,
  addCrmEnquiryEmail,
  addCrmEnquiryMessage,
  addCrmEnquiryNote,
  addCrmEnquiryTask,
  createCrmEnquiryJob,
  createCrmEnquiry,
  forceDeleteCrmEnquiry,
  getCrmEnquiryOverview,
  listCrmCustomerReferences,
  listCrmEnquiries,
  listCrmEnquiryReferences,
  listCrmUserReferences,
  startCrmEnquiryJob,
  stopCrmEnquiryJob,
  updateCrmEnquiryJob,
  suspendCrmEnquiryMessage,
  updateCrmEnquiry
} from "./crm.services";
import type {
  CrmEnquiry,
  CrmEnquirySavePayload,
  CrmEnquiryStatusFilter,
  CrmEnquiryView
} from "./crm.types";

export const crmEnquiryQueryKey = ["crm", "enquiries"] as const;

export function useCrmOverviewQuery(enabled = true) {
  return useQuery({
    enabled,
    queryFn: getCrmEnquiryOverview,
    queryKey: [...crmEnquiryQueryKey, "overview"]
  });
}

export function useCrmEnquiriesQuery(input: {
  enquiryId?: string;
  search?: string;
  status?: CrmEnquiryStatusFilter;
  view: CrmEnquiryView;
}) {
  return useQuery({
    queryFn: () => listCrmEnquiries(input),
    queryKey: [
      ...crmEnquiryQueryKey,
      input.view,
      input.status ?? "active",
      input.search ?? "",
      input.enquiryId ?? 0
    ]
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

export function useCrmCustomerReferencesQuery(search: string, enabled = true) {
  return useQuery({
    enabled,
    queryFn: () => listCrmCustomerReferences(search),
    queryKey: [...crmEnquiryQueryKey, "customers", search.trim()],
    staleTime: 30_000
  });
}

export function useCrmEnquiryMutations() {
  const client = useQueryClient();
  const done = () => client.invalidateQueries({ queryKey: crmEnquiryQueryKey });
  return {
    create: useMutation({ mutationFn: createCrmEnquiry, onSuccess: done }),
    forceDelete: useMutation({
      mutationFn: (record: CrmEnquiry) => forceDeleteCrmEnquiry(record.frappeName),
      onSuccess: done
    }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: CrmEnquirySavePayload }) =>
        updateCrmEnquiry(id, payload),
      onSuccess: done
    })
  };
}

export function useCrmEnquiryChildMutations(onSaved: (record: CrmEnquiry) => void) {
  const client = useQueryClient();
  const done = async (record: CrmEnquiry) => {
    onSaved(record);
    await client.invalidateQueries({ queryKey: crmEnquiryQueryKey });
  };
  return {
    attachment: useMutation({
      mutationFn: (input: Parameters<typeof addCrmEnquiryAttachment>) =>
        addCrmEnquiryAttachment(...input),
      onSuccess: done
    }),
    call: useMutation({
      mutationFn: (input: Parameters<typeof addCrmEnquiryCall>) => addCrmEnquiryCall(...input),
      onSuccess: done
    }),
    email: useMutation({
      mutationFn: (input: Parameters<typeof addCrmEnquiryEmail>) => addCrmEnquiryEmail(...input),
      onSuccess: done
    }),
    message: useMutation({
      mutationFn: (input: Parameters<typeof addCrmEnquiryMessage>) =>
        addCrmEnquiryMessage(...input),
      onSuccess: done
    }),
    messageSuspend: useMutation({
      mutationFn: (input: Parameters<typeof suspendCrmEnquiryMessage>) =>
        suspendCrmEnquiryMessage(...input),
      onSuccess: done
    }),
    jobStart: useMutation({
      mutationFn: startCrmEnquiryJob,
      onSuccess: done
    }),
    jobCreate: useMutation({
      mutationFn: (input: Parameters<typeof createCrmEnquiryJob>) => createCrmEnquiryJob(...input),
      onSuccess: done
    }),
    jobStop: useMutation({
      mutationFn: (input: Parameters<typeof stopCrmEnquiryJob>) => stopCrmEnquiryJob(...input),
      onSuccess: done
    }),
    jobUpdate: useMutation({
      mutationFn: (input: Parameters<typeof updateCrmEnquiryJob>) => updateCrmEnquiryJob(...input),
      onSuccess: done
    }),
    note: useMutation({
      mutationFn: (input: Parameters<typeof addCrmEnquiryNote>) => addCrmEnquiryNote(...input),
      onSuccess: done
    }),
    task: useMutation({
      mutationFn: (input: Parameters<typeof addCrmEnquiryTask>) => addCrmEnquiryTask(...input),
      onSuccess: done
    })
  };
}
