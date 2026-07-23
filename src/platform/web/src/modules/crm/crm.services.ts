import { apiDelete, apiGet, apiPost, apiPut } from "../../shared/api/platform-api";
import type {
  CrmEnquiry,
  CrmEnquiryOverview,
  CrmEnquiryReference,
  CrmEnquirySavePayload,
  CrmEnquiryView,
  CrmUserReference
} from "./crm.types";

const path = "/tenant/crm/enquiries";

export function listCrmEnquiries(input: {
  enquiryId?: number;
  search?: string;
  view: CrmEnquiryView;
}) {
  const query = new URLSearchParams({ view: input.view });
  if (input.search?.trim()) query.set("search", input.search.trim());
  if (input.enquiryId) query.set("enquiryId", String(input.enquiryId));
  return apiGet<CrmEnquiry[]>(`${path}?${query}`, "tenant");
}

export function getCrmEnquiryOverview() {
  return apiGet<CrmEnquiryOverview>(`${path}/overview`, "tenant");
}

export function createCrmEnquiry(payload: CrmEnquirySavePayload) {
  return apiPost<CrmEnquiry>(path, payload, "tenant");
}

export function updateCrmEnquiry(id: number, payload: CrmEnquirySavePayload) {
  return apiPut<CrmEnquiry>(`${path}/${id}`, payload, "tenant");
}

export function suspendCrmEnquiry(id: number) {
  return apiPost<CrmEnquiry>(`${path}/${id}/suspend`, {}, "tenant");
}

export function restoreCrmEnquiry(id: number) {
  return apiPost<CrmEnquiry>(`${path}/${id}/restore`, {}, "tenant");
}

export function forceDeleteCrmEnquiry(id: number) {
  return apiDelete<CrmEnquiry>(`${path}/${id}/force`, "tenant");
}

export function listCrmUserReferences() {
  return apiGet<CrmUserReference[]>(`${path}/user-references`, "tenant");
}

export function listCrmEnquiryReferences() {
  return apiGet<CrmEnquiryReference[]>(`${path}/references`, "tenant");
}
