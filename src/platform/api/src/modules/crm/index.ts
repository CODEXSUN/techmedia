export { crmModule } from "./crm.module.js";
export { crmMigrations, migrateCrmModule } from "./crm.migration.js";
export { crmEnquirySyncContract } from "./crm.service.js";
export { seedCrmModule } from "./crm.seed.js";
export type {
  CrmEnquiry,
  CrmEnquiryOverview,
  CrmEnquiryMessage,
  CrmEnquiryPriority,
  CrmEnquirySavePayload,
  CrmEnquirySchedule,
  CrmEnquiryStatus,
  CrmEnquirySyncInput,
  CrmEnquiryView
} from "./crm.types.js";
