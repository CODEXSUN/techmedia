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
  enquiryDoctype: "Enquiry";
  lastPullAt: string | null;
  lastPushAt: string | null;
  pullEnquiriesEnabled: boolean;
  pushEnquiriesEnabled: boolean;
  updatedAt: string;
};

export type FrappeSyncSettingsSavePayload = Pick<
  FrappeSyncSettings,
  "pullEnquiriesEnabled" | "pushEnquiriesEnabled"
>;

export type FrappeSyncResult = {
  created: number;
  direction: "pull" | "push";
  failed: number;
  processed: number;
  updated: number;
};
