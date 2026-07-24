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
