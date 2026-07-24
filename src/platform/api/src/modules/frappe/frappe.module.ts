import { defineModule } from "@codexsun/framework/modules";
import type { PlatformModuleDependencies } from "../../module-dependencies.js";
import { registerFrappeRoutes } from "./frappe.routes.js";

/**
 * Frappe owns the tenant connection, enquiry sync, and remote-user import workflow.
 * The singleton connection intentionally has no delete or active/inactive CRUD lifecycle.
 */
export const frappeModule = defineModule<PlatformModuleDependencies>({
  key: "frappe.connection",
  label: "Frappe Connection",
  register: ({ app }) => registerFrappeRoutes(app)
});
