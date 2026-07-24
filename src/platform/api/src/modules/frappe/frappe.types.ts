import type { Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";

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

export type FrappeSyncSettings = {
  enquiryDoctype: string;
  lastPullAt: string | null;
  lastPushAt: string | null;
  pullEnquiriesEnabled: boolean;
  pushEnquiriesEnabled: boolean;
  updatedAt: string;
};

export type FrappeSyncSettingsSavePayload = {
  pullEnquiriesEnabled: boolean;
  pushEnquiriesEnabled: boolean;
};

export type FrappeSyncResult = {
  created: number;
  direction: "pull" | "push";
  failed: number;
  processed: number;
  updated: number;
};

export type FrappeEnquiryLifecycleResult = {
  action: "created" | "deleted" | "skipped" | "updated";
  frappeName: string | null;
};

export type FrappeEnquiryResyncResult = {
  action: "created" | "updated";
  frappeName: string;
};

export type FrappeEnquiryLifecycleContract = {
  delete: (enquiryId: number, userId: number) => Promise<FrappeEnquiryLifecycleResult>;
  resync: (enquiryId: number, userId: number) => Promise<FrappeEnquiryResyncResult>;
  upsert: (enquiryId: number, userId: number) => Promise<FrappeEnquiryLifecycleResult>;
};

export type FrappeEnquiryLifecycleFactory = (context: {
  actorEmail: string;
  database: Kysely<TenantDatabase>;
  tenantId: string;
}) => FrappeEnquiryLifecycleContract;

export type FrappeLiveEnquiryView = "assigned" | "created" | "open";

export type FrappeLiveEmployee = {
  email: string;
  name: string;
  title: string;
};

export type FrappeLiveEnquiryMessage = {
  comment: string;
  createdAt: string | null;
  createdBy: string | null;
  name: string;
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
  name: string;
  status: string;
  statusDetails: string;
  subject: string;
  userEmployee: string;
};

export type FrappeLiveEnquirySavePayload = {
  assignedToEmployee: string | null;
  customer: string;
  enquiryDate: string | null;
  enquiryGroup: string;
  enquiryMessage: string;
  messages: Array<{ comment: string }>;
  mobile: string;
  status: string;
  statusDetails: string;
  subject: string;
};

export type FrappeLiveEnquiryMessageSavePayload = {
  comment: string;
  name?: string;
};

export type FrappeLiveEnquiryGateway = {
  create: (input: FrappeLiveEnquirySavePayload) => Promise<FrappeLiveEnquiry>;
  delete: (name: string) => Promise<void>;
  employees: () => Promise<FrappeLiveEmployee[]>;
  get: (name: string) => Promise<FrappeLiveEnquiry>;
  list: (input: {
    employee: string;
    search?: string;
    view: FrappeLiveEnquiryView;
  }) => Promise<FrappeLiveEnquiry[]>;
  update: (name: string, input: FrappeLiveEnquirySavePayload) => Promise<FrappeLiveEnquiry>;
  updateMessages: (
    name: string,
    messages: FrappeLiveEnquiryMessageSavePayload[]
  ) => Promise<FrappeLiveEnquiry>;
};

export type FrappeLiveEnquiryGatewayFactory = (context: {
  database: Kysely<TenantDatabase>;
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
  database: Kysely<TenantDatabase>;
  tenantId: string;
};
