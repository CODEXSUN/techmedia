import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveHrStaffRequest,
  createHrStaffRequest,
  getHrStaffRequest,
  listHrStaffRequests,
  updateHrStaffRequest
} from "./hr.services";
import type { HrStaffRequestSavePayload, HrStaffRequestView } from "./hr.types";

const key = ["hr", "staff-requests"] as const;

export function useHrStaffRequestsQuery(view: HrStaffRequestView) {
  return useQuery({ queryFn: () => listHrStaffRequests(view), queryKey: [...key, view] });
}

export function useHrStaffRequestMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  return {
    approve: useMutation({ mutationFn: approveHrStaffRequest, onSuccess: invalidate }),
    create: useMutation({ mutationFn: createHrStaffRequest, onSuccess: invalidate }),
    get: useMutation({ mutationFn: getHrStaffRequest }),
    update: useMutation({
      mutationFn: ({ name, payload }: { name: string; payload: HrStaffRequestSavePayload }) =>
        updateHrStaffRequest(name, payload),
      onSuccess: invalidate
    })
  };
}
