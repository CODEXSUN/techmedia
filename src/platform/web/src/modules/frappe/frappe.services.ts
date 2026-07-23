import { apiGet, apiPost, apiPut } from "../../shared/api/platform-api";
import type {
  FrappeConnectionSavePayload,
  FrappeConnectionSettings,
  FrappeConnectionVerificationPayload,
  FrappeConnectionVerificationResult,
  FrappeSyncResult,
  FrappeSyncSettings,
  FrappeSyncSettingsSavePayload
} from "./frappe.types";

const path = "/tenant/frappe/settings";

export function getFrappeConnectionSettings() {
  return apiGet<FrappeConnectionSettings | null>(path, "tenant");
}

export function saveFrappeConnectionSettings(payload: FrappeConnectionSavePayload) {
  return apiPut<FrappeConnectionSettings>(path, payload, "tenant");
}

export function verifyFrappeConnection(payload: FrappeConnectionVerificationPayload) {
  return apiPost<FrappeConnectionVerificationResult>(`${path}/verify`, payload, "tenant");
}

const syncPath = "/tenant/frappe/enquiry-sync";

export function getFrappeSyncSettings() {
  return apiGet<FrappeSyncSettings | null>(syncPath, "tenant");
}

export function saveFrappeSyncSettings(payload: FrappeSyncSettingsSavePayload) {
  return apiPut<FrappeSyncSettings>(syncPath, payload, "tenant");
}

export function runFrappeEnquirySync(direction: "pull" | "push") {
  return apiPost<FrappeSyncResult>(`${syncPath}/${direction}`, {}, "tenant");
}
