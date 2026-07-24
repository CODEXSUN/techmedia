import type { Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";

export type CrmEnquiryPriority = "low" | "normal" | "high" | "urgent";
export type CrmEnquiryStatus = "escalation" | "follow" | "lost" | "open" | "won";
export type CrmEnquiryLifecycleStatus = "active" | "suspended";
export type CrmEnquiryView = "assigned" | "created" | "open";

export type CrmEnquirySchedule = {
  id: string;
  scheduledOn: string;
};

export type CrmStoredEnquiryMessage = {
  comment: string;
  createdAt: string;
  createdByUserId: number | null;
  id: number;
  messageType: "comment" | "reply";
};

export type CrmEnquiryMessage = {
  canDelete: boolean;
  canEdit: boolean;
  comment: string;
  createdAt: string;
  createdByUserId: string | null;
  id: string;
  messageType: "comment" | "reply";
};

export type CrmEnquiryEmail = {
  body: string;
  createdAt: string;
  createdByUserId: number;
  id: number;
  recipient: string;
  subject: string;
  uuid: string;
};

export type CrmEnquiryCall = {
  calledAt: string;
  createdAt: string;
  createdByUserId: number;
  id: number;
  phone: string;
  summary: string;
  uuid: string;
};

export type CrmEnquiryTask = {
  createdAt: string;
  createdByUserId: number;
  dueOn: string | null;
  id: number;
  status: "completed" | "pending";
  title: string;
  uuid: string;
};

export type CrmEnquiryNote = {
  createdAt: string;
  createdByUserId: number;
  id: number;
  note: string;
  uuid: string;
};

export type CrmEnquiryAttachment = {
  createdAt: string;
  createdByUserId: number;
  fileName: string;
  fileUrl: string;
  id: number;
  uuid: string;
};

export type CrmEnquiryActivity = {
  action: string;
  createdAt: string;
  createdByUserId: number;
  details: string;
  id: number;
  uuid: string;
};

export type CrmUserReference = {
  email: string;
  id: string;
  name: string;
  uuid: string;
};

export type CrmEnquiry = {
  activities: CrmEnquiryActivity[];
  assignedTo: CrmUserReference | null;
  assignedToUserId: string | null;
  attachments: CrmEnquiryAttachment[];
  calls: CrmEnquiryCall[];
  createdAt: string;
  createdBy: CrmUserReference;
  createdByUserId: string;
  customer: string;
  enquiryDate: string | null;
  enquiryGroup: string;
  emails: CrmEnquiryEmail[];
  id: number;
  frappeName: string;
  lifecycleStatus: CrmEnquiryLifecycleStatus;
  messages: CrmEnquiryMessage[];
  mobile: string;
  priority: CrmEnquiryPriority;
  notes: CrmEnquiryNote[];
  schedules: CrmEnquirySchedule[];
  status: CrmEnquiryStatus;
  subject: string;
  title: string;
  tasks: CrmEnquiryTask[];
  updatedAt: string;
  uuid: string;
  workspace: string;
};

export type CrmEnquiryMessageCreatePayload = {
  comment: string;
  messageType: "comment" | "reply";
};

export type CrmEnquiryMessageUpdatePayload = {
  comment: string;
};

export type CrmEnquiryEmailCreatePayload = {
  body: string;
  recipient: string;
  subject: string;
};

export type CrmEnquiryCallCreatePayload = {
  calledAt: string;
  phone: string;
  summary: string;
};

export type CrmEnquiryTaskCreatePayload = {
  dueOn: string | null;
  status: "completed" | "pending";
  title: string;
};

export type CrmEnquiryNoteCreatePayload = { note: string };

export type CrmEnquiryAttachmentCreatePayload = {
  fileName: string;
  fileUrl: string;
};

export type CrmEnquirySavePayload = {
  assignedToUserId: string | null;
  customer: string;
  enquiryDate: string | null;
  enquiryGroup: string;
  messages: Array<{ comment: string }>;
  mobile: string;
  priority: CrmEnquiryPriority;
  schedules: Array<{ scheduledOn: string }>;
  status: CrmEnquiryStatus;
  subject: string;
  title: string;
  workspace: string;
};

export type CrmEnquirySyncInput = Omit<CrmEnquirySavePayload, "assignedToUserId"> & {
  assignedToUserId: number | null;
  createdByUserId: number;
};

export type CrmEnquiryListFilters = {
  enquiryId?: string;
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

export type CrmEnquiryExternalLifecycle = {
  delete: (enquiryId: number, userId: number) => Promise<unknown>;
  resync: (enquiryId: number, userId: number) => Promise<CrmEnquiryResyncResult>;
  upsert: (enquiryId: number, userId: number) => Promise<unknown>;
};

export type CrmEnquiryResyncResult = {
  action: "created" | "updated";
  frappeName: string;
};

export type CrmContext = {
  actorEmail: string;
  actorUser: () => Promise<CrmActor | undefined>;
  authorize: (permission: string) => Promise<void>;
  can: (permission: string) => Promise<boolean>;
  database: Kysely<TenantDatabase>;
  frappeEmployeeCode: string | null;
  tenantId: string;
};
