export { CrmOverview } from "./crm.overview";
export { CrmReports } from "./crm.reports";
export {
  crmInAppNotificationEvent,
  showCrmDesktopNotification,
  useBrowserNotificationPermission,
  useCrmCallNotificationPreference,
  type CrmInAppNotification
} from "./crm.call-notifications";
export { CrmNotificationSettings } from "./crm.notification-settings";
export { CrmEnquiryUpsertPage } from "./crm.upsert-page";
export { CrmWorkspace } from "./crm.workspace";
export { useCrmOverviewQuery } from "./crm.hooks";
export type {
  CrmEnquiry,
  CrmEnquiryOverview,
  CrmEnquirySavePayload,
  CrmEnquiryView
} from "./crm.types";
