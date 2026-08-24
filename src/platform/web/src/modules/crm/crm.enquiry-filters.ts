import { crmEnquiryStatusOptions } from "./crm.options";
import type { CrmEnquiry, CrmEnquiryStatus, CrmEnquiryStatusFilter } from "./crm.types";

export type CrmEnquiryListFilter = CrmEnquiryStatusFilter | "unassigned";

export const crmEnquiryListFilters: Array<{ id: CrmEnquiryListFilter; label: string }> = [
  { id: "all", label: "All calls" },
  { id: "unassigned", label: "Unassigned" },
  { id: "active", label: "Active (except won and lost)" },
  { id: "hold", label: "Hold" },
  { id: "other", label: "Other" },
  { id: "in-progress", label: "In progress (holds and escalation)" },
  { id: "closed", label: "Closed (won, lost)" },
  ...crmEnquiryStatusOptions.map(({ label, value }) => ({ id: value, label }))
];

export function enquiryFilterFromUrl(): CrmEnquiryListFilter {
  if (typeof window === "undefined") return "all";
  const value = new URLSearchParams(window.location.search).get("status");
  return crmEnquiryListFilters.some((filter) => filter.id === value)
    ? (value as CrmEnquiryListFilter)
    : "all";
}

export function matchesEnquiryFilter(record: CrmEnquiry, filter: CrmEnquiryListFilter) {
  return filter === "unassigned" ? !record.assignedTo : matchesStatusFilter(record.status, filter);
}

export function countEnquiriesForFilter(records: CrmEnquiry[], filter: CrmEnquiryListFilter) {
  return records.filter((record) => matchesEnquiryFilter(record, filter)).length;
}

function matchesStatusFilter(status: CrmEnquiryStatus, filter: CrmEnquiryStatusFilter) {
  if (filter === "all") return true;
  if (filter === "active") return !isClosedStatus(status);
  if (filter === "closed") return isClosedStatus(status);
  if (filter === "hold") return isHoldStatus(status);
  if (filter === "in-progress") return isHoldStatus(status) || status === "escalation";
  if (filter === "other") return status === "escalation" || status === "reopen";
  return status === filter;
}

function isClosedStatus(status: CrmEnquiryStatus) {
  return status === "won" || status === "lost";
}

function isHoldStatus(status: CrmEnquiryStatus) {
  return ["hold-for-approval", "hold-for-spares", "hold-for-job-out", "long-hold"].includes(status);
}
