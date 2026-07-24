import { defineModule } from "@codexsun/framework/modules";
import type { PlatformModuleDependencies } from "../../module-dependencies.js";
import { registerCrmRoutes } from "./crm.routes.js";

/** CRM Enquiry owns its workflow status, lifecycle state, and guarded permanent deletion. */
export const crmModule = defineModule<PlatformModuleDependencies>({
  key: "crm.enquiry",
  label: "CRM Enquiries",
  register: ({ app, frappeEnquiryLifecycle }) => registerCrmRoutes(app, frappeEnquiryLifecycle)
});
