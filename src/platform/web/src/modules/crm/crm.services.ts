import { apiDelete, apiGet, apiPost, apiPut } from "../../shared/api/platform-api";
import type {
  CrmEnquiry,
  CrmEnquiryAttachmentCreatePayload,
  CrmEnquiryCallCreatePayload,
  CrmEnquiryEmailCreatePayload,
  CrmEnquiryMessageCreatePayload,
  CrmEnquiryMessageUpdatePayload,
  CrmEnquiryNoteCreatePayload,
  CrmEnquiryOverview,
  CrmEnquiryReference,
  CrmEnquiryResyncResult,
  CrmEnquirySavePayload,
  CrmEnquiryTaskCreatePayload,
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

export function resyncCrmEnquiry(id: number) {
  return apiPost<CrmEnquiryResyncResult>(`${path}/${id}/resync`, {}, "tenant");
}

export function forceDeleteCrmEnquiry(id: number) {
  return apiDelete<CrmEnquiry>(`${path}/${id}/force`, "tenant");
}

export function addCrmEnquiryMessage(id: number, payload: CrmEnquiryMessageCreatePayload) {
  return apiPost<CrmEnquiry>(`${path}/${id}/messages`, payload, "tenant");
}

export function updateCrmEnquiryMessage(
  id: number,
  messageId: number,
  payload: CrmEnquiryMessageUpdatePayload
) {
  return apiPut<CrmEnquiry>(`${path}/${id}/messages/${messageId}`, payload, "tenant");
}

export function deleteCrmEnquiryMessage(id: number, messageId: number) {
  return apiDelete<CrmEnquiry>(`${path}/${id}/messages/${messageId}`, "tenant");
}

export function addCrmEnquiryEmail(id: number, payload: CrmEnquiryEmailCreatePayload) {
  return apiPost<CrmEnquiry>(`${path}/${id}/emails`, payload, "tenant");
}

export function addCrmEnquiryCall(id: number, payload: CrmEnquiryCallCreatePayload) {
  return apiPost<CrmEnquiry>(`${path}/${id}/calls`, payload, "tenant");
}

export function addCrmEnquiryTask(id: number, payload: CrmEnquiryTaskCreatePayload) {
  return apiPost<CrmEnquiry>(`${path}/${id}/tasks`, payload, "tenant");
}

export function addCrmEnquiryNote(id: number, payload: CrmEnquiryNoteCreatePayload) {
  return apiPost<CrmEnquiry>(`${path}/${id}/notes`, payload, "tenant");
}

export function addCrmEnquiryAttachment(id: number, payload: CrmEnquiryAttachmentCreatePayload) {
  return apiPost<CrmEnquiry>(`${path}/${id}/attachments`, payload, "tenant");
}

export function listCrmUserReferences() {
  return apiGet<CrmUserReference[]>(`${path}/user-references`, "tenant");
}

export function listCrmEnquiryReferences() {
  return apiGet<CrmEnquiryReference[]>(`${path}/references`, "tenant");
}
