import type { FastifyInstance } from "fastify";
import { registerContractRoute } from "@codexsun/framework/http";
import { z } from "zod";
import { identityContext } from "../../auth/identity-context.js";
import { NotificationService } from "./notification.service.js";

const path = "/notifications";
const item = z.object({
  body: z.string(),
  createdAt: z.iso.datetime(),
  id: z.number().int().positive(),
  resourceId: z.string(),
  title: z.string(),
  type: z.enum(["assignment", "comment", "reply", "status"])
});
const params = z.object({ id: z.coerce.number().int().positive() });

export function registerNotificationRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    method: "GET",
    url: path,
    schemas: { response: z.array(item) },
    handler: ({ request }) => new NotificationService(identityContext(request)).inbox()
  });
  registerContractRoute(app, {
    method: "PUT",
    url: `${path}/:id/read`,
    schemas: { params, response: item },
    handler: ({ params, request }) => new NotificationService(identityContext(request)).markRead(params.id)
  });
}
