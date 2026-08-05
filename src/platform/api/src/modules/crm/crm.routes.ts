import { registerContractRoute } from "@codexsun/framework/http";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { identityContext } from "../../auth/identity-context.js";
import type { PlatformModuleDependencies } from "../../module-dependencies.js";
import { CrmService } from "./crm.service.js";

const path = "/crm/enquiries";
const priority = z.enum(["low", "normal", "high", "urgent"]);
const status = z.enum(["open", "follow", "escalation", "won", "lost"]);
const userReference = z.object({
  email: z.string(),
  id: z.string().min(1),
  name: z.string(),
  uuid: z.string().min(1)
});
const message = z.object({
  canSuspend: z.boolean(),
  comment: z.string(),
  createdAt: z.iso.datetime(),
  createdByUserId: z.string().nullable(),
  id: z.string().min(1),
  isSuspended: z.boolean(),
  messageType: z.enum(["comment", "reply"]),
  parentMessageId: z.string().nullable()
});
const job = z.object({
  createdAt: z.iso.datetime(),
  employee: z.string(),
  employeeCostPerHour: z.number(),
  enquiry: z.string(),
  hours: z.number(),
  name: z.string(),
  startTime: z.string(),
  status: z.enum(["Running", "Completed", "Cancelled"]),
  stopTime: z.string().nullable(),
  totalCost: z.number()
});
const record = z.object({
  activities: z.array(z.unknown()),
  assignedTo: userReference.nullable(),
  assignedToUserId: z.string().nullable(),
  attachments: z.array(z.unknown()),
  calls: z.array(z.unknown()),
  createdAt: z.iso.datetime(),
  createdBy: userReference,
  createdByUserId: z.string(),
  customer: z.string(),
  enquiryDate: z.iso.date().nullable(),
  enquiryGroup: z.string(),
  emails: z.array(z.unknown()),
  frappeName: z.string().min(1),
  id: z.number().int().positive(),
  jobs: z.array(job),
  lifecycleStatus: z.literal("active"),
  messages: z.array(message),
  mobile: z.string(),
  notes: z.array(z.unknown()),
  priority,
  schedules: z.array(z.object({ id: z.string(), scheduledOn: z.iso.date() })),
  status,
  tasks: z.array(z.unknown()),
  title: z.string(),
  updatedAt: z.iso.datetime(),
  uuid: z.string().min(1),
  workspace: z.string()
});
const payload = z.object({
  assignedToUserId: z.string().trim().min(1).nullable(),
  customer: z.string().trim().max(140),
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
const params = z.object({ id: z.string().trim().min(1).max(140) });
const messageParams = params.extend({ messageId: z.string().trim().min(1).max(240) });
const messagePayload = z.object({
  comment: z.string().trim().min(1).max(10_000),
  messageType: z.enum(["comment", "reply"]),
  parentMessageId: z.string().trim().min(1).max(240).nullable().optional()
});
const jobParams = params.extend({ jobName: z.string().trim().min(1).max(240) });
const jobTime = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/u, "Use a valid 24-hour time.");
const jobPayload = z
  .object({
    employee: z.string().trim().min(1).max(140),
    employeeCostPerHour: z.number().finite().nonnegative().max(10_000_000),
    startTime: jobTime,
    status: z.enum(["Running", "Completed", "Cancelled"]),
    stopTime: jobTime.nullable()
  })
  .superRefine((value, context) => {
    if (value.status !== "Running" && !value.stopTime) {
      context.addIssue({
        code: "custom",
        message: "Stop time is required for a completed or cancelled job.",
        path: ["stopTime"]
      });
    }
  });
const query = z.object({
  enquiryId: z.string().trim().min(1).max(140).optional(),
  search: z.string().trim().max(220).optional(),
  status: z
    .enum(["active", "in-progress", "closed", "open", "follow", "escalation", "won", "lost"])
    .optional(),
  view: z.enum(["assigned", "created", "open"])
});
const customerReferenceQuery = z.object({
  search: z.string().trim().max(140).optional()
});
const customerReference = z.object({
  id: z.string().min(1).max(140),
  name: z.string().min(1).max(220)
});
const overview = z.object({
  stats: z.object({
    closedByMe: z.number().int().nonnegative(),
    createdByMe: z.number().int().nonnegative(),
    inProgress: z.number().int().nonnegative(),
    myEnquiries: z.number().int().nonnegative()
  })
});

export async function registerCrmRoutes(
  app: FastifyInstance,
  frappeLiveEnquiryGateway: PlatformModuleDependencies["frappeLiveEnquiryGateway"]
) {
  registerContractRoute(app, {
    method: "GET",
    url: path,
    schemas: { querystring: query, response: z.array(record) },
    handler: async ({ query, request }) =>
      (await service(request)).list({
        view: query.view,
        ...(query.enquiryId ? { enquiryId: query.enquiryId } : {}),
        ...(query.search ? { search: query.search } : {}),
        ...(query.status ? { status: query.status } : {})
      })
  });
  registerContractRoute(app, {
    method: "POST",
    url: `${path}/:id/jobs/start`,
    schemas: { params, response: record },
    handler: async ({ params, request }) => (await service(request)).startJob(params.id)
  });
  registerContractRoute(app, {
    method: "POST",
    url: `${path}/:id/jobs/:jobName/stop`,
    schemas: { params: jobParams, response: record },
    handler: async ({ params, request }) =>
      (await service(request)).stopJob(params.id, params.jobName)
  });
  registerContractRoute(app, {
    method: "POST",
    url: `${path}/:id/jobs`,
    schemas: { body: jobPayload, params, response: record },
    handler: async ({ body, params, request }) =>
      (await service(request)).createJob(params.id, body)
  });
  registerContractRoute(app, {
    method: "PUT",
    url: `${path}/:id/jobs/:jobName`,
    schemas: { body: jobPayload, params: jobParams, response: record },
    handler: async ({ body, params, request }) =>
      (await service(request)).updateJob(params.id, params.jobName, body)
  });
  registerContractRoute(app, {
    method: "GET",
    url: `${path}/overview`,
    schemas: { response: overview },
    handler: async ({ request }) => (await service(request)).overview()
  });
  registerContractRoute(app, {
    method: "GET",
    url: `${path}/references`,
    schemas: { response: z.array(z.object({ id: z.string(), title: z.string() })) },
    handler: async ({ request }) => (await service(request)).enquiryReferences()
  });
  registerContractRoute(app, {
    method: "GET",
    url: `${path}/user-references`,
    schemas: { response: z.array(userReference) },
    handler: async ({ request }) => (await service(request)).userReferences()
  });
  registerContractRoute(app, {
    method: "GET",
    url: `${path}/customer-references`,
    schemas: { querystring: customerReferenceQuery, response: z.array(customerReference) },
    handler: async ({ query, request }) => (await service(request)).customerReferences(query.search)
  });
  registerContractRoute(app, {
    method: "GET",
    url: `${path}/:id`,
    schemas: { params, response: record },
    handler: async ({ params, request }) => (await service(request)).get(params.id)
  });
  registerContractRoute(app, {
    method: "POST",
    url: path,
    schemas: { body: payload, response: record },
    handler: async ({ body, request }) => (await service(request)).create(body)
  });
  registerContractRoute(app, {
    method: "PUT",
    url: `${path}/:id`,
    schemas: { body: payload, params, response: record },
    handler: async ({ body, params, request }) => (await service(request)).update(params.id, body)
  });
  registerContractRoute(app, {
    method: "POST",
    url: `${path}/:id/messages`,
    schemas: { body: messagePayload, params, response: record },
    handler: async ({ body, params, request }) =>
      (await service(request)).addMessage(params.id, body)
  });
  registerContractRoute(app, {
    method: "POST",
    url: `${path}/:id/messages/:messageId/suspend`,
    schemas: { params: messageParams, response: record },
    handler: async ({ params, request }) =>
      (await service(request)).suspendMessage(params.id, params.messageId)
  });
  registerContractRoute(app, {
    method: "DELETE",
    url: `${path}/:id/force`,
    schemas: { params, response: record },
    handler: async ({ params, request }) => (await service(request)).forceDelete(params.id)
  });

  async function service(request: Parameters<typeof identityContext>[0]) {
    const context = identityContext(request);
    const actor = await context.actorUser();
    if (!actor) throw new Error("Active user is required.");
    const crmContext = {
      ...context,
      frappeEmployeeCode: actor.frappeEmployeeCode
    };
    return new CrmService(
      crmContext,
      frappeLiveEnquiryGateway({
        database: context.database,
        employee: actor.frappeEmployeeCode,
        userId: actor.id
      })
    );
  }
}
