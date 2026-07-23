import type { Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";

export type FrappeConnectionSettings = {
  apiKeyConfigured: boolean;
  apiSecretConfigured: boolean;
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
  apiKey?: string;
  apiSecret?: string;
  baseUrl: string;
  connectionName: string;
  enabled: boolean;
};

export type FrappeConnectionCredentials = {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  connectionName: string;
  enabled: boolean;
};

export type FrappeConnectionVerificationPayload = {
  apiKey?: string;
  apiSecret?: string;
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

export type FrappeContext = {
  actorEmail: string;
  authorize: (permission: string) => Promise<void>;
  database: Kysely<TenantDatabase>;
  tenantId: string;
};
