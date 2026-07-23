import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { registerContractRoute } from "@codexsun/framework/http";
import { tenantAccessContext } from "../../auth/tenant-access-context.js";
import { CrmService } from "./crm.service.js";

const path = "/tenant/crm/enquiries";
const priority = z.enum(["low", "normal", "high", "urgent"]);
const status = z.enum(["open", "follow", "escalation", "won", "lost"]);
const lifecycleStatus = z.enum(["active", "suspended"]);
const message = z.object({ comment: z.string(), id: z.number().int().positive() });
const userReference = z.object({
  email: z.string().email(),
  id: z.number().int().positive(),
  name: z.string(),
  uuid: z.string().length(8)
});
const schedule = z.object({ id: z.number().int().positive(), scheduledOn: z.iso.date() });
const record = z.object({
  assignedTo: userReference.nullable(),
  assignedToUserId: z.number().int().positive().nullable(),
  createdAt: z.iso.datetime(),
  createdBy: userReference,
  createdByUserId: z.number().int().positive(),
  customer: z.string(),
  enquiryDate: z.iso.date().nullable(),
  enquiryGroup: z.string(),
  id: z.number().int().positive(),
  lifecycleStatus,
  messages: z.array(message),
  mobile: z.string(),
  priority,
  schedules: z.array(schedule),
  status,
  title: z.string(),
  updatedAt: z.iso.datetime(),
  uuid: z.string().length(8),
  workspace: z.string()
});
const payload = z.object({
  assignedToUserId: z.number().int().positive().nullable(),
  customer: z.string().trim().max(220),
  enquiryDate: z.iso.date().nullable(),
  enquiryGroup: z.string().trim().max(80),
  messages: z.array(z.object({ comment: z.string().trim().min(1).max(10_000) })).max(100),
  mobile: z.string().trim().min(5).max(40),
  priority,
  schedules: z.array(z.object({ scheduledOn: z.iso.date() })).max(20),
  status,
  title: z.string().trim().min(2).max(220),
  workspace: z.string().trim().max(100_000)
});
const params = z.object({ id: z.coerce.number().int().positive() });
const query = z.object({
  enquiryId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().max(220).optional(),
  view: z.enum(["assigned", "created", "open"])
});
const overview = z.object({
  leaderboard: z.array(
    z.object({
      active: z.number().int().nonnegative(),
      closed: z.number().int().nonnegative(),
      completionRate: z.number().int().min(0).max(100),
      total: z.number().int().nonnegative(),
      user: userReference
    })
  ),
  stats: z.object({
    closed: z.number().int().nonnegative(),
    inProgress: z.number().int().nonnegative(),
    open: z.number().int().nonnegative(),
    total: z.number().int().nonnegative()
  })
});

export async function registerCrmRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    method: "GET",
    url: path,
    schemas: { querystring: query, response: z.array(record) },
    handler: ({ query, request }) =>
      new CrmService(tenantAccessContext(request)).list({
        view: query.view,
        ...(query.enquiryId ? { enquiryId: query.enquiryId } : {}),
        ...(query.search ? { search: query.search } : {})
      })
  });
  registerContractRoute(app, {
    method: "GET",
    url: `${path}/overview`,
    schemas: { response: overview },
    handler: ({ request }) => new CrmService(tenantAccessContext(request)).overview()
  });
  registerContractRoute(app, {
    method: "GET",
    url: `${path}/references`,
    schemas: {
      response: z.array(z.object({ id: z.number().int().positive(), title: z.string() }))
    },
    handler: ({ request }) => new CrmService(tenantAccessContext(request)).enquiryReferences()
  });
  registerContractRoute(app, {
    method: "GET",
    url: `${path}/user-references`,
    schemas: { response: z.array(userReference) },
    handler: ({ request }) => new CrmService(tenantAccessContext(request)).userReferences()
  });
  registerContractRoute(app, {
    method: "GET",
    url: `${path}/:id`,
    schemas: { params, response: record },
    handler: ({ params, request }) => new CrmService(tenantAccessContext(request)).get(params.id)
  });
  registerContractRoute(app, {
    method: "POST",
    url: path,
    schemas: { body: payload, response: record },
    handler: ({ body, request }) => new CrmService(tenantAccessContext(request)).create(body)
  });
  registerContractRoute(app, {
    method: "PUT",
    url: `${path}/:id`,
    schemas: { body: payload, params, response: record },
    handler: ({ body, params, request }) =>
      new CrmService(tenantAccessContext(request)).update(params.id, body)
  });
  registerContractRoute(app, {
    method: "POST",
    url: `${path}/:id/suspend`,
    schemas: { params, response: record },
    handler: ({ params, request }) =>
      new CrmService(tenantAccessContext(request)).suspend(params.id)
  });
  registerContractRoute(app, {
    method: "POST",
    url: `${path}/:id/restore`,
    schemas: { params, response: record },
    handler: ({ params, request }) =>
      new CrmService(tenantAccessContext(request)).restore(params.id)
  });
  registerContractRoute(app, {
    method: "DELETE",
    url: `${path}/:id/force`,
    schemas: { params, response: record },
    handler: ({ params, request }) =>
      new CrmService(tenantAccessContext(request)).forceDelete(params.id)
  });
}
