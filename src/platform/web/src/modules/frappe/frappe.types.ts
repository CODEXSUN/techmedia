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
