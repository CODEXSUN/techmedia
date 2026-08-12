import type { Kysely } from "kysely";
import type { TechMediaDatabase } from "../../database/schema.js";

export type CrmEnquiryPriority = "low" | "normal" | "high" | "urgent";
export type CrmEnquiryStatus =
  | "escalation"
  | "hold-for-approval"
  | "hold-for-job-out"
  | "hold-for-spares"
  | "long-hold"
  | "lost"
  | "new"
  | "open"
  | "reopen"
  | "won";
export type CrmEnquiryStatusFilter = CrmEnquiryStatus | "active" | "closed" | "in-progress";
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
  canSuspend: boolean;
  comment: string;
  createdAt: string;
  createdByUserId: string | null;
  id: string;
  messageType: "comment" | "reply";
  parentMessageId: string | null;
  isSuspended: boolean;
};

export type CrmJobExecution = {
  createdAt: string;
  employee: string;
  employeeCostPerHour: number;
  enquiry: string;
  hours: number;
  name: string;
  startTime: string;
  status: "Cancelled" | "Completed" | "Running";
  stopTime: string | null;
  totalCost: number;
};

export type CrmJobSavePayload = {
  employee: string;
  employeeCostPerHour: number;
  startTime: string;
  status: "Cancelled" | "Completed" | "Running";
  stopTime: string | null;
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

export type CrmCustomerReference = {
  id: string;
  name: string;
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
  jobs: CrmJobExecution[];
  lifecycleStatus: CrmEnquiryLifecycleStatus;
  messages: CrmEnquiryMessage[];
  mobile: string;
  priority: CrmEnquiryPriority;
  notes: CrmEnquiryNote[];
  schedules: CrmEnquirySchedule[];
  status: CrmEnquiryStatus;
  title: string;
  tasks: CrmEnquiryTask[];
  updatedAt: string;
  updatedByUserId: string | null;
  uuid: string;
  workspace: string;
};

export type CrmEnquiryMessageCreatePayload = {
  comment: string;
  messageType: "comment" | "reply";
  parentMessageId?: string | null | undefined;
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
  messages: Array<{ comment: string; mode?: "comment" | "reply" | undefined }>;
  mobile: string;
  priority: CrmEnquiryPriority;
  schedules: Array<{ scheduledOn: string }>;
  status: CrmEnquiryStatus;
  /** @deprecated Transition-only storage column; live Frappe enquiries do not use Subject. */
  subject?: string;
  title: string;
  workspace: string;
};

export type CrmEnquiryListFilters = {
  enquiryId?: string;
  search?: string;
  status?: CrmEnquiryStatusFilter;
  view: CrmEnquiryView;
};

export type CrmEnquiryOverview = {
  stats: {
    closedByMe: number;
    createdByMe: number;
    inProgress: number;
    myEnquiries: number;
  };
};

export type CrmReportName = "list-in-status" | "owner-status";

export type CrmReportColumn = {
  fieldname: string;
  label: string;
};

export type CrmReport = {
  columns: CrmReportColumn[];
  rows: Array<Record<string, number | string | null>>;
};

export type CrmContext = {
  actorEmail: string;
  actorUserId: number;
  authorize: (permission: string) => Promise<void>;
  can: (permission: string) => Promise<boolean>;
  database: Kysely<TechMediaDatabase>;
  frappeEmployeeCode: string | null;
};
