import type { FastifyInstance } from "fastify";
import type { PlatformModuleDependencies } from "../../module-dependencies.js";
import { z } from "zod";
import { registerContractRoute } from "@codexsun/framework/http";
import { tenantAccessContext } from "../../auth/tenant-access-context.js";
import { CrmService } from "./crm.service.js";

const path = "/tenant/crm/enquiries";
const priority = z.enum(["low", "normal", "high", "urgent"]);
const status = z.enum(["open", "follow", "escalation", "won", "lost"]);
const lifecycleStatus = z.enum(["active", "suspended"]);
const message = z.object({
  canDelete: z.boolean(),
  canEdit: z.boolean(),
  comment: z.string(),
  createdAt: z.iso.datetime(),
  createdByUserId: z.number().int().positive().nullable(),
  id: z.number().int().positive(),
  messageType: z.enum(["comment", "reply"])
});
const email = z.object({
  body: z.string(),
  createdAt: z.iso.datetime(),
  createdByUserId: z.number().int().positive(),
  id: z.number().int().positive(),
  recipient: z.string(),
  subject: z.string(),
  uuid: z.string().length(8)
});
const call = z.object({
  calledAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
  createdByUserId: z.number().int().positive(),
  id: z.number().int().positive(),
  phone: z.string(),
  summary: z.string(),
  uuid: z.string().length(8)
});
const task = z.object({
  createdAt: z.iso.datetime(),
  createdByUserId: z.number().int().positive(),
  dueOn: z.iso.date().nullable(),
  id: z.number().int().positive(),
  status: z.enum(["completed", "pending"]),
  title: z.string(),
  uuid: z.string().length(8)
});
const note = z.object({
  createdAt: z.iso.datetime(),
  createdByUserId: z.number().int().positive(),
  id: z.number().int().positive(),
  note: z.string(),
  uuid: z.string().length(8)
});
const attachment = z.object({
  createdAt: z.iso.datetime(),
  createdByUserId: z.number().int().positive(),
  fileName: z.string(),
  fileUrl: z.string(),
  id: z.number().int().positive(),
  uuid: z.string().length(8)
});
const activity = z.object({
  action: z.string(),
  createdAt: z.iso.datetime(),
  createdByUserId: z.number().int().positive(),
  details: z.string(),
  id: z.number().int().positive(),
  uuid: z.string().length(8)
});
const userReference = z.object({
  email: z.string().email(),
  id: z.number().int().positive(),
  name: z.string(),
  uuid: z.string().length(8)
});
const schedule = z.object({ id: z.number().int().positive(), scheduledOn: z.iso.date() });
const record = z.object({
  activities: z.array(activity),
  assignedTo: userReference.nullable(),
  assignedToUserId: z.number().int().positive().nullable(),
  attachments: z.array(attachment),
  calls: z.array(call),
  createdAt: z.iso.datetime(),
  createdBy: userReference,
  createdByUserId: z.number().int().positive(),
  customer: z.string(),
  enquiryDate: z.iso.date().nullable(),
  enquiryGroup: z.string(),
  emails: z.array(email),
  id: z.number().int().positive(),
  lifecycleStatus,
  messages: z.array(message),
  mobile: z.string(),
  notes: z.array(note),
  priority,
  schedules: z.array(schedule),
  status,
  subject: z.string(),
  title: z.string(),
  tasks: z.array(task),
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
  subject: z.string().trim().max(220).default(""),
  title: z.string().trim().min(2).max(220),
  workspace: z.string().trim().max(100_000)
});
const params = z.object({ id: z.coerce.number().int().positive() });
const messageParams = params.extend({ messageId: z.coerce.number().int().positive() });
const messagePayload = z.object({
  comment: z.string().trim().min(1).max(10_000),
  messageType: z.enum(["comment", "reply"])
});
const messageUpdatePayload = z.object({
  comment: z.string().trim().min(1).max(10_000)
});
const emailPayload = z.object({
  body: z.string().trim().min(1).max(100_000),
  recipient: z.string().trim().email().max(320),
  subject: z.string().trim().min(1).max(220)
});
const callPayload = z.object({
  calledAt: z.iso.datetime(),
  phone: z.string().trim().min(5).max(40),
  summary: z.string().trim().min(1).max(10_000)
});
const taskPayload = z.object({
  dueOn: z.iso.date().nullable(),
  status: z.enum(["completed", "pending"]),
  title: z.string().trim().min(1).max(220)
});
const notePayload = z.object({ note: z.string().trim().min(1).max(100_000) });
const attachmentPayload = z.object({
  fileName: z.string().trim().min(1).max(255),
  fileUrl: z.string().trim().url().max(2048)
});
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
const resyncResult = z.object({
  action: z.enum(["created", "updated"]),
  frappeName: z.string().min(1)
});

export async function registerCrmRoutes(
  app: FastifyInstance,
  frappeEnquiryLifecycle: PlatformModuleDependencies["frappeEnquiryLifecycle"]
) {
  registerContractRoute(app, {
    method: "GET",
    url: path,
    schemas: { querystring: query, response: z.array(record) },
    handler: ({ query, request }) =>
      service(request).list({
        view: query.view,
        ...(query.enquiryId ? { enquiryId: query.enquiryId } : {}),
        ...(query.search ? { search: query.search } : {})
      })
  });
  registerContractRoute(app, {
    method: "GET",
    url: `${path}/overview`,
    schemas: { response: overview },
    handler: ({ request }) => service(request).overview()
  });
  registerContractRoute(app, {
    method: "GET",
    url: `${path}/references`,
    schemas: {
      response: z.array(z.object({ id: z.number().int().positive(), title: z.string() }))
    },
    handler: ({ request }) => service(request).enquiryReferences()
  });
  registerContractRoute(app, {
    method: "GET",
    url: `${path}/user-references`,
    schemas: { response: z.array(userReference) },
    handler: ({ request }) => service(request).userReferences()
  });
  registerContractRoute(app, {
    method: "GET",
    url: `${path}/:id`,
    schemas: { params, response: record },
    handler: ({ params, request }) => service(request).get(params.id)
  });
  registerContractRoute(app, {
    method: "POST",
    url: path,
    schemas: { body: payload, response: record },
    handler: ({ body, request }) => service(request).create(body)
  });
  registerContractRoute(app, {
    method: "PUT",
    url: `${path}/:id`,
    schemas: { body: payload, params, response: record },
    handler: ({ body, params, request }) => service(request).update(params.id, body)
  });
  registerContractRoute(app, {
    method: "POST",
    url: `${path}/:id/suspend`,
    schemas: { params, response: record },
    handler: ({ params, request }) => service(request).suspend(params.id)
  });
  registerContractRoute(app, {
    method: "POST",
    url: `${path}/:id/restore`,
    schemas: { params, response: record },
    handler: ({ params, request }) => service(request).restore(params.id)
  });
  registerContractRoute(app, {
    method: "POST",
    url: `${path}/:id/resync`,
    schemas: { params, response: resyncResult },
    handler: ({ params, request }) => service(request).resync(params.id)
  });
  registerContractRoute(app, {
    method: "POST",
    url: `${path}/:id/messages`,
    schemas: { body: messagePayload, params, response: record },
    handler: ({ body, params, request }) => service(request).addMessage(params.id, body)
  });
  registerContractRoute(app, {
    method: "PUT",
    url: `${path}/:id/messages/:messageId`,
    schemas: { body: messageUpdatePayload, params: messageParams, response: record },
    handler: ({ body, params, request }) =>
      service(request).updateMessage(params.id, params.messageId, body)
  });
  registerContractRoute(app, {
    method: "DELETE",
    url: `${path}/:id/messages/:messageId`,
    schemas: { params: messageParams, response: record },
    handler: ({ params, request }) => service(request).deleteMessage(params.id, params.messageId)
  });
  registerContractRoute(app, {
    method: "POST",
    url: `${path}/:id/emails`,
    schemas: { body: emailPayload, params, response: record },
    handler: ({ body, params, request }) => service(request).addEmail(params.id, body)
  });
  registerContractRoute(app, {
    method: "POST",
    url: `${path}/:id/calls`,
    schemas: { body: callPayload, params, response: record },
    handler: ({ body, params, request }) => service(request).addCall(params.id, body)
  });
  registerContractRoute(app, {
    method: "POST",
    url: `${path}/:id/tasks`,
    schemas: { body: taskPayload, params, response: record },
    handler: ({ body, params, request }) => service(request).addTask(params.id, body)
  });
  registerContractRoute(app, {
    method: "POST",
    url: `${path}/:id/notes`,
    schemas: { body: notePayload, params, response: record },
    handler: ({ body, params, request }) => service(request).addNote(params.id, body)
  });
  registerContractRoute(app, {
    method: "POST",
    url: `${path}/:id/attachments`,
    schemas: { body: attachmentPayload, params, response: record },
    handler: ({ body, params, request }) => service(request).addAttachment(params.id, body)
  });
  registerContractRoute(app, {
    method: "DELETE",
    url: `${path}/:id/force`,
    schemas: { params, response: record },
    handler: ({ params, request }) => service(request).forceDelete(params.id)
  });

  function service(request: Parameters<typeof tenantAccessContext>[0]) {
    const context = tenantAccessContext(request);
    return new CrmService(
      context,
      frappeEnquiryLifecycle({
        actorEmail: context.actorEmail,
        database: context.database,
        tenantId: context.tenantId
      })
    );
  }
}
