import { apiPost } from "../../../../platform/web/src/shared/api/platform-api";
import type { CrmEnquiry } from "../../../../platform/web/src/modules/crm/crm.types";

export type MobileCallCapture = { customerName: string; direction: "incoming" | "outgoing"; durationSeconds: number; message: string; mobile: string; occurredAt: string };
export function captureMobileCall(input: MobileCallCapture) { return apiPost<CrmEnquiry>("/mobile/crm/call-enquiries", input); }
