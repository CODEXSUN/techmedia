import type { Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";

export type CrmEnquiryPriority = "low" | "normal" | "high" | "urgent";
export type CrmEnquiryStatus = "escalation" | "follow" | "lost" | "open" | "won";
export type CrmEnquiryLifecycleStatus = "active" | "suspended";
export type CrmEnquiryView = "assigned" | "created" | "open";

export type CrmEnquirySchedule = {
  id: number;
  scheduledOn: string;
};

export type CrmEnquiryMessage = {
  comment: string;
  id: number;
};

export type CrmUserReference = {
  email: string;
  id: number;
  name: string;
  uuid: string;
};

export type CrmEnquiry = {
  assignedTo: CrmUserReference | null;
  assignedToUserId: number | null;
  createdAt: string;
  createdBy: CrmUserReference;
  createdByUserId: number;
  customer: string;
  enquiryDate: string | null;
  enquiryGroup: string;
  id: number;
  lifecycleStatus: CrmEnquiryLifecycleStatus;
  messages: CrmEnquiryMessage[];
  mobile: string;
  priority: CrmEnquiryPriority;
  schedules: CrmEnquirySchedule[];
  status: CrmEnquiryStatus;
  title: string;
  updatedAt: string;
  uuid: string;
  workspace: string;
};

export type CrmEnquirySavePayload = {
  assignedToUserId: number | null;
  customer: string;
  enquiryDate: string | null;
  enquiryGroup: string;
  messages: Array<{ comment: string }>;
  mobile: string;
  priority: CrmEnquiryPriority;
  schedules: Array<{ scheduledOn: string }>;
  status: CrmEnquiryStatus;
  title: string;
  workspace: string;
};

export type CrmEnquirySyncInput = CrmEnquirySavePayload & {
  createdByUserId: number;
};

export type CrmEnquiryListFilters = {
  enquiryId?: number;
  search?: string;
  view: CrmEnquiryView;
};

export type CrmEnquiryOverview = {
  leaderboard: Array<{
    active: number;
    closed: number;
    completionRate: number;
    total: number;
    user: CrmUserReference;
  }>;
  stats: {
    closed: number;
    inProgress: number;
    open: number;
    total: number;
  };
};

export type CrmActor = {
  email: string;
  id: number;
  name: string;
  role: string;
  status: "active" | "inactive" | "suspended";
  uuid: string;
};

export type CrmContext = {
  actorEmail: string;
  actorUser: () => Promise<CrmActor | undefined>;
  authorize: (permission: string) => Promise<void>;
  can: (permission: string) => Promise<boolean>;
  database: Kysely<TenantDatabase>;
  tenantId: string;
};
