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
  CrmEnquirySavePayload,
  CrmEnquiryTaskCreatePayload,
  CrmEnquiryView,
  CrmUserReference
} from "./crm.types";

const path = "/tenant/crm/enquiries";

export function listCrmEnquiries(input: {
  enquiryId?: string;
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

export function getCrmEnquiry(name: string) {
  return apiGet<CrmEnquiry>(`${path}/${encodeURIComponent(name)}`, "tenant");
}

export function createCrmEnquiry(payload: CrmEnquirySavePayload) {
  return apiPost<CrmEnquiry>(path, payload, "tenant");
}

export function updateCrmEnquiry(id: string, payload: CrmEnquirySavePayload) {
  return apiPut<CrmEnquiry>(`${path}/${id}`, payload, "tenant");
}

export function suspendCrmEnquiry(id: string) {
  return apiPost<CrmEnquiry>(`${path}/${id}/suspend`, {}, "tenant");
}

export function restoreCrmEnquiry(id: string) {
  return apiPost<CrmEnquiry>(`${path}/${id}/restore`, {}, "tenant");
}

export function forceDeleteCrmEnquiry(id: string) {
  return apiDelete<CrmEnquiry>(`${path}/${id}/force`, "tenant");
}

export function addCrmEnquiryMessage(id: string, payload: CrmEnquiryMessageCreatePayload) {
  return apiPost<CrmEnquiry>(`${path}/${id}/messages`, payload, "tenant");
}

export function updateCrmEnquiryMessage(
  id: string,
  messageId: string,
  payload: CrmEnquiryMessageUpdatePayload
) {
  return apiPut<CrmEnquiry>(`${path}/${id}/messages/${messageId}`, payload, "tenant");
}

export function deleteCrmEnquiryMessage(id: string, messageId: string) {
  return apiDelete<CrmEnquiry>(`${path}/${id}/messages/${messageId}`, "tenant");
}

export function startCrmEnquiryJob(id: string) {
  return apiPost<CrmEnquiry>(`${path}/${id}/jobs/start`, {}, "tenant");
}

export function stopCrmEnquiryJob(id: string, jobName: string) {
  return apiPost<CrmEnquiry>(
    `${path}/${id}/jobs/${encodeURIComponent(jobName)}/stop`,
    {},
    "tenant"
  );
}

export function addCrmEnquiryEmail(id: string, payload: CrmEnquiryEmailCreatePayload) {
  return apiPost<CrmEnquiry>(`${path}/${id}/emails`, payload, "tenant");
}

export function addCrmEnquiryCall(id: string, payload: CrmEnquiryCallCreatePayload) {
  return apiPost<CrmEnquiry>(`${path}/${id}/calls`, payload, "tenant");
}

export function addCrmEnquiryTask(id: string, payload: CrmEnquiryTaskCreatePayload) {
  return apiPost<CrmEnquiry>(`${path}/${id}/tasks`, payload, "tenant");
}

export function addCrmEnquiryNote(id: string, payload: CrmEnquiryNoteCreatePayload) {
  return apiPost<CrmEnquiry>(`${path}/${id}/notes`, payload, "tenant");
}

export function addCrmEnquiryAttachment(id: string, payload: CrmEnquiryAttachmentCreatePayload) {
  return apiPost<CrmEnquiry>(`${path}/${id}/attachments`, payload, "tenant");
}

export function listCrmUserReferences() {
  return apiGet<CrmUserReference[]>(`${path}/user-references`, "tenant");
}

export function listCrmEnquiryReferences() {
  return apiGet<CrmEnquiryReference[]>(`${path}/references`, "tenant");
}
