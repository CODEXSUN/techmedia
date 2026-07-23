import { defineModule } from "@codexsun/framework/modules";
import type { PlatformModuleDependencies } from "../../module-dependencies.js";
import { registerFrappeRoutes } from "./frappe.routes.js";

/**
 * Frappe owns one tenant connection settings record. This singleton configuration
 * intentionally has no list, delete, or active/inactive CRUD lifecycle.
 */
export const frappeModule = defineModule<PlatformModuleDependencies>({
  key: "frappe.connection",
  label: "Frappe Connection",
  register: ({ app }) => registerFrappeRoutes(app)
});
