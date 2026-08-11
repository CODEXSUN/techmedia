import type { Kysely } from "kysely";
import type { TechMediaDatabase } from "../../database/schema.js";

export type FrappeConnectionSettings = {
  appKeyConfigured: boolean;
  appSecretConfigured: boolean;
  baseUrl: string;
  connectionName: string;
  enabled: boolean;
  id: number;
  lastCheckedAt: string | null;
  lastVerifiedAt: string | null;
  updatedAt: string;
  uuid: string;
  verificationStatus: FrappeConnectionVerificationStatus;
};

export type FrappeConnectionVerificationStatus = "live" | "offline" | "unverified";

export type FrappeConnectionSavePayload = {
  appKey?: string;
  appSecret?: string;
  baseUrl: string;
  connectionName: string;
  enabled: boolean;
  saveToEnvironment: true;
};

export type FrappeConnectionCredentials = {
  apiKey: string;
  apiSecret: string;
  authenticatedUser: string | null;
  baseUrl: string;
  connectionName: string;
  enabled: boolean;
};

export type FrappeConnectionVerificationPayload = {
  appKey?: string;
  appSecret?: string;
  baseUrl: string;
};

export type FrappeConnectionVerificationResult = {
  authenticatedUser: string;
  baseUrl: string;
  checkedAt: string;
  connected: true;
  latencyMs: number;
};

export type FrappeUserVerificationResult = FrappeConnectionVerificationResult & {
  employeeCode: string;
};

export type FrappeLiveEnquiryView = "assigned" | "created" | "open";

export type FrappeLiveEmployee = {
  email: string;
  name: string;
  title: string;
};

export type FrappeLiveCustomerReference = {
  id: string;
  name: string;
};

export type FrappeLiveEnquiryMessage = {
  comment: string;
  createdAt: string | null;
  createdBy: string | null;
  name: string;
  parentMessage: string | null;
};

export type FrappeLiveJobExecution = {
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

export type FrappeLiveJobExecutionSavePayload = {
  employee: string;
  employeeCostPerHour: number;
  startTime: string;
  status: "Cancelled" | "Completed" | "Running";
  stopTime: string | null;
};

export type FrappeLiveEnquiryActivity = {
  action: "added" | "changed" | "edited" | "removed" | "viewed";
  createdAt: string;
  createdBy: string;
  details: string;
  name: string;
};

export type FrappeLiveEnquiry = {
  activities: FrappeLiveEnquiryActivity[];
  assignedToEmployee: string | null;
  createdAt: string;
  customer: string;
  enquiryDate: string | null;
  enquiryGroup: string;
  enquiryMessage: string;
  messages: FrappeLiveEnquiryMessage[];
  mobile: string;
  modifiedAt: string;
  modifiedBy: string | null;
  name: string;
  priority: "high" | "low" | "normal" | "urgent";
  status: string;
  title: string;
  userEmployee: string;
};

export type FrappeLiveEnquirySavePayload = {
  assignedToEmployee: string | null;
  customer: string;
  enquiryDate: string | null;
  enquiryGroup: string;
  enquiryMessage: string;
  messages: Array<{ comment: string; mode?: "comment" | "reply" }>;
  mobile: string;
  priority: "high" | "low" | "normal" | "urgent";
  status: string;
  title: string;
};

export type FrappeLiveEnquiryMessageSavePayload = {
  comment: string;
  mode?: "comment" | "reply";
  name?: string;
  parentMessage?: string | null;
};

export type FrappeLiveEnquiryGateway = {
  create: (input: FrappeLiveEnquirySavePayload) => Promise<FrappeLiveEnquiry>;
  customers: (search?: string) => Promise<FrappeLiveCustomerReference[]>;
  delete: (name: string) => Promise<void>;
  employees: () => Promise<FrappeLiveEmployee[]>;
  get: (name: string) => Promise<FrappeLiveEnquiry>;
  jobs: (name: string) => Promise<FrappeLiveJobExecution[]>;
  createJob: (
    name: string,
    input: FrappeLiveJobExecutionSavePayload
  ) => Promise<FrappeLiveJobExecution>;
  list: (input: { employee: string; view: FrappeLiveEnquiryView }) => Promise<FrappeLiveEnquiry[]>;
  queryReport: (input: {
    filters: Record<string, string | null>;
    reportName: "Enquiry List-In wise Status" | "Enquiry Owner wise Status";
  }) => Promise<{
    columns: Array<{ fieldname: string; label: string }>;
    rows: Array<Record<string, number | string | null>>;
  }>;
  update: (name: string, input: FrappeLiveEnquirySavePayload) => Promise<FrappeLiveEnquiry>;
  updateMessages: (
    name: string,
    messages: FrappeLiveEnquiryMessageSavePayload[],
    status?: string
  ) => Promise<FrappeLiveEnquiry>;
  startJob: (name: string) => Promise<FrappeLiveJobExecution>;
  stopJob: (name: string, jobName: string) => Promise<FrappeLiveJobExecution>;
  updateJob: (
    name: string,
    jobName: string,
    input: FrappeLiveJobExecutionSavePayload
  ) => Promise<FrappeLiveJobExecution>;
};

export type FrappeLiveEnquiryGatewayFactory = (context: {
  database: Kysely<TechMediaDatabase>;
  employee: string | null;
  userId: number;
}) => FrappeLiveEnquiryGateway;

export type FrappeUserPreview = {
  email: string;
  enabled: boolean;
  frappeUserId: string;
  lastActiveAt: string | null;
  localStatus: "active" | "inactive" | "suspended" | null;
  localUserId: number | null;
  name: string;
  userType: string;
};

export type FrappeUserImportResult = {
  created: boolean;
  temporaryPassword: string | null;
  user: {
    email: string;
    id: number;
    name: string;
    status: "active" | "inactive" | "suspended";
    uuid: string;
  };
};

export type FrappeContext = {
  actorEmail: string;
  actorUser: () => Promise<
    | {
        email: string;
        id: number;
        name: string;
        role: string;
        status: string;
        uuid: string;
      }
    | undefined
  >;
  authorize: (permission: string) => Promise<void>;
  database: Kysely<TechMediaDatabase>;
};
