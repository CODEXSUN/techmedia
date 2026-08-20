import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "@codexsun/framework/errors";
import { registerContractRoute } from "@codexsun/framework/http";
import { ConversationService } from "./conversation.service.js";
import { MessageService } from "./message.service.js";
import { messageDtoSchema, messagingContext, messageTypeValues } from "./messaging.types.js";
import type { MessagingRepository } from "./messaging.repositories.js";
import type { RealtimeBus } from "./realtime-bus.js";
import { realtimeFrame } from "./realtime-gateway.js";

const memberRecord = z.object({
  conversationId: z.number().int().positive(),
  email: z.string(),
  joinedAt: z.iso.datetime(),
  lastReadMessageId: z.number().int().positive().nullable(),
  notificationLevel: z.enum(["all", "mentions", "muted"]),
  role: z.enum(["ADMIN", "MEMBER", "OWNER", "VIEWER"]),
  userId: z.number().int().positive(),
  userName: z.string()
});
const conversationRecord = z.object({
  avatar: z.string().nullable(),
  createdBy: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  id: z.number().int().positive(),
  lastMessageId: z.number().int().positive().nullable(),
  lastMessage: messageDtoSchema.nullable(),
  lastMessageSequence: z.number().int().nonnegative(),
  members: z.array(memberRecord),
  metadata: z.record(z.string(), z.unknown()),
  status: z.enum(["active", "archived", "deleted"]),
  title: z.string().nullable(),
  type: z.enum([
    "DIRECT",
    "GROUP",
    "TEAM",
    "PROJECT",
    "CUSTOMER",
    "SUPPORT",
    "SYSTEM"
  ]),
  updatedAt: z.iso.datetime(),
  uuid: z.string()
  ,unreadCount: z.number().int().nonnegative()
});
const params = z.object({ id: z.coerce.number().int().positive() });
const contactsQuery = z.object({ search: z.string().trim().max(180).default("") });
const contactRecord = z.object({ email: z.string().email(), id: z.number().int().positive(), name: z.string() });
const createBody = z
  .object({
    memberIds: z.array(z.number().int().positive()),
    metadata: z.record(z.string(), z.unknown()).optional(),
    title: z.string().trim().max(180).nullable().optional(),
    type: z.enum(["DIRECT", "GROUP", "TEAM", "PROJECT", "CUSTOMER", "SUPPORT", "SYSTEM"])
  })
  .strict();
const addMemberBody = z
  .object({
    role: z.enum(["ADMIN", "MEMBER", "OWNER", "VIEWER"]),
    userId: z.number().int().positive()
  })
  .strict();
const messagesQuery = z.object({
  beforeSequence: z.coerce.number().int().nonnegative().optional(),
  limit: z.coerce.number().int().positive().max(200).default(50)
});
const sendBody = z
  .object({
    clientMessageId: z.string().trim().min(1).max(80),
    content: z.string().trim().min(1).max(10_000),
    metadata: z.record(z.string(), z.unknown()).optional(),
    replyToMessageId: z.number().int().positive().nullable().optional(),
    type: z.enum(messageTypeValues)
  })
  .strict();
const readBody = z.object({ messageId: z.number().int().positive() }).strict();

export function registerMessagingRoutes(
  app: FastifyInstance,
  repository: MessagingRepository,
  bus: RealtimeBus
): void {
  registerContractRoute(app, {
    method: "GET",
    url: "/messaging/contacts",
    schemas: { querystring: contactsQuery, response: z.array(contactRecord) },
    handler: ({ query, request }) =>
      new ConversationService(messagingContext(request), repository).listContacts(query.search)
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/messaging/conversations/:id/read",
    schemas: { body: readBody, params, response: z.object({ messageId: z.number().int().positive() }) },
    handler: async ({ body, params, request }) => {
      const service = new MessageService(messagingContext(request), repository);
      await service.markRead(params.id, body.messageId);
      return { messageId: body.messageId };
    }
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/messaging/conversations",
    schemas: { response: z.array(conversationRecord) },
    handler: ({ request }) =>
      new ConversationService(messagingContext(request), repository).list()
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/messaging/conversations",
    schemas: { body: createBody, response: conversationRecord },
    handler: ({ body, request }) =>
      new ConversationService(messagingContext(request), repository).create(body)
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/messaging/conversations/:id",
    schemas: { params, response: conversationRecord },
    handler: async ({ params, request }) =>
      new ConversationService(messagingContext(request), repository).get(params.id)
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/messaging/conversations/:id/members",
    schemas: { body: addMemberBody, params, response: memberRecord },
    handler: ({ body, params, request }) =>
      new ConversationService(messagingContext(request), repository).addMember(
        params.id,
        body.userId,
        body.role
      )
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/messaging/conversations/:id/messages",
    schemas: { params, querystring: messagesQuery, response: z.array(messageDtoSchema) },
    handler: ({ params, query, request }) =>
      new MessageService(messagingContext(request), repository).list(params.id, {
        ...(query.beforeSequence !== undefined ? { beforeSequence: query.beforeSequence } : {}),
        limit: query.limit
      })
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/messaging/conversations/:id/messages",
    schemas: { body: sendBody, params, response: messageDtoSchema },
    handler: async ({ body, params, request }) => {
      const message = await new MessageService(messagingContext(request), repository).send(
        params.id,
        body
      );
      if (!message) throw AppError.internal("Message was not created.");
      const members = await repository.listMembers(params.id);
      bus.publishToConversation(
        members.map((member) => member.user_id),
        params.id,
        realtimeFrame("message.created", { conversationId: params.id, message })
      );
      return message;
    }
  });
}
