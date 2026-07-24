import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addCrmEnquiryAttachment,
  addCrmEnquiryCall,
  addCrmEnquiryEmail,
  addCrmEnquiryMessage,
  addCrmEnquiryNote,
  addCrmEnquiryTask,
  createCrmEnquiry,
  deleteCrmEnquiryMessage,
  forceDeleteCrmEnquiry,
  getCrmEnquiryOverview,
  listCrmEnquiries,
  listCrmEnquiryReferences,
  listCrmUserReferences,
  resyncCrmEnquiry,
  restoreCrmEnquiry,
  suspendCrmEnquiry,
  updateCrmEnquiryMessage,
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
    resync: useMutation({
      mutationFn: (record: CrmEnquiry) => resyncCrmEnquiry(record.id),
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
    messageDelete: useMutation({
      mutationFn: (input: Parameters<typeof deleteCrmEnquiryMessage>) =>
        deleteCrmEnquiryMessage(...input),
      onSuccess: done
    }),
    messageUpdate: useMutation({
      mutationFn: (input: Parameters<typeof updateCrmEnquiryMessage>) =>
        updateCrmEnquiryMessage(...input),
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
