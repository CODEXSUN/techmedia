import { apiGet, apiPost } from "../../../../platform/web/src/shared/api/platform-api";
import type { CrmEnquiry, CrmEnquiryOverview } from "../../../../platform/web/src/modules/crm/crm.types";

const jobsPath = "/mobile/crm/jobs";

export function getMobileJobSummary() {
  return apiGet<CrmEnquiryOverview>(`${jobsPath}/summary`);
}

export function listMobileJobs(status: "active" | "closed" | "in-progress") {
  return apiGet<CrmEnquiry[]>(`${jobsPath}?${new URLSearchParams({ status })}`);
}

export function addMobileJobComment(id: string, comment: string) {
  return apiPost<CrmEnquiry>(`${jobsPath}/${encodeURIComponent(id)}/comments`, { comment });
}

export function startMobileJob(id: string) {
  return apiPost<CrmEnquiry>(`${jobsPath}/${encodeURIComponent(id)}/start`, {});
}

export function stopMobileJob(id: string, jobName: string) {
  return apiPost<CrmEnquiry>(
    `${jobsPath}/${encodeURIComponent(id)}/jobs/${encodeURIComponent(jobName)}/stop`,
    {}
  );
}
