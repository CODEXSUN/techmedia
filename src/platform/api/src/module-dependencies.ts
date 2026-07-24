import type { FastifyInstance } from "fastify";
import type { FrappeEnquiryLifecycleFactory } from "./modules/frappe/frappe.types.js";

/** Dependencies available to every Platform module at composition time. */
export type PlatformModuleDependencies = {
  app: FastifyInstance;
  frappeEnquiryLifecycle: FrappeEnquiryLifecycleFactory;
};
