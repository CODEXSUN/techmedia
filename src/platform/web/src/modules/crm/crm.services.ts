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
  CrmJobSavePayload,
  CrmUserReference
} from "./crm.types";

const path = "/crm/enquiries";

export function listCrmEnquiries(input: {
  enquiryId?: string;
  search?: string;
  view: CrmEnquiryView;
}) {
  const query = new URLSearchParams({ view: input.view });
  if (input.search?.trim()) query.set("search", input.search.trim());
  if (input.enquiryId) query.set("enquiryId", String(input.enquiryId));
  return apiGet<CrmEnquiry[]>(`${path}?${query}`);
}

export function getCrmEnquiryOverview() {
  return apiGet<CrmEnquiryOverview>(`${path}/overview`);
}

export function getCrmEnquiry(name: string) {
  return apiGet<CrmEnquiry>(`${path}/${encodeURIComponent(name)}`);
}

export function createCrmEnquiry(payload: CrmEnquirySavePayload) {
  return apiPost<CrmEnquiry>(path, payload);
}

export function updateCrmEnquiry(id: string, payload: CrmEnquirySavePayload) {
  return apiPut<CrmEnquiry>(`${path}/${id}`, payload);
}

export function suspendCrmEnquiry(id: string) {
  return apiPost<CrmEnquiry>(`${path}/${id}/suspend`, {});
}

export function restoreCrmEnquiry(id: string) {
  return apiPost<CrmEnquiry>(`${path}/${id}/restore`, {});
}

export function forceDeleteCrmEnquiry(id: string) {
  return apiDelete<CrmEnquiry>(`${path}/${id}/force`);
}

export function addCrmEnquiryMessage(id: string, payload: CrmEnquiryMessageCreatePayload) {
  return apiPost<CrmEnquiry>(`${path}/${id}/messages`, payload);
}

export function updateCrmEnquiryMessage(
  id: string,
  messageId: string,
  payload: CrmEnquiryMessageUpdatePayload
) {
  return apiPut<CrmEnquiry>(`${path}/${id}/messages/${messageId}`, payload);
}

export function deleteCrmEnquiryMessage(id: string, messageId: string) {
  return apiDelete<CrmEnquiry>(`${path}/${id}/messages/${messageId}`);
}

export function startCrmEnquiryJob(id: string) {
  return apiPost<CrmEnquiry>(`${path}/${id}/jobs/start`, {});
}

export function stopCrmEnquiryJob(id: string, jobName: string) {
  return apiPost<CrmEnquiry>(`${path}/${id}/jobs/${encodeURIComponent(jobName)}/stop`, {});
}

export function createCrmEnquiryJob(id: string, payload: CrmJobSavePayload) {
  return apiPost<CrmEnquiry>(`${path}/${id}/jobs`, payload);
}

export function updateCrmEnquiryJob(id: string, jobName: string, payload: CrmJobSavePayload) {
  return apiPut<CrmEnquiry>(`${path}/${id}/jobs/${encodeURIComponent(jobName)}`, payload);
}

export function addCrmEnquiryEmail(id: string, payload: CrmEnquiryEmailCreatePayload) {
  return apiPost<CrmEnquiry>(`${path}/${id}/emails`, payload);
}

export function addCrmEnquiryCall(id: string, payload: CrmEnquiryCallCreatePayload) {
  return apiPost<CrmEnquiry>(`${path}/${id}/calls`, payload);
}

export function addCrmEnquiryTask(id: string, payload: CrmEnquiryTaskCreatePayload) {
  return apiPost<CrmEnquiry>(`${path}/${id}/tasks`, payload);
}

export function addCrmEnquiryNote(id: string, payload: CrmEnquiryNoteCreatePayload) {
  return apiPost<CrmEnquiry>(`${path}/${id}/notes`, payload);
}

export function addCrmEnquiryAttachment(id: string, payload: CrmEnquiryAttachmentCreatePayload) {
  return apiPost<CrmEnquiry>(`${path}/${id}/attachments`, payload);
}

export function listCrmUserReferences() {
  return apiGet<CrmUserReference[]>(`${path}/user-references`);
}

export function listCrmEnquiryReferences() {
  return apiGet<CrmEnquiryReference[]>(`${path}/references`);
}
