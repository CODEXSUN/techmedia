import type { FastifyInstance } from "fastify";
import { AppError } from "@codexsun/framework/errors";
import { registerContractRoute } from "@codexsun/framework/http";
import { requireSuperAdmin } from "../../auth/super-admin.guard.js";
import {
  orchestratedAppListSchema,
  orchestratedAppParamsSchema,
  orchestratedAppSchema
} from "./app-orchestration.schemas.js";
import { AppOrchestrationService } from "./app-orchestration.service.js";

export async function registerAppOrchestrationRoutes(
  app: FastifyInstance,
  service = new AppOrchestrationService()
) {
  registerContractRoute(app, {
    handler: () => service.list(),
    method: "GET",
    preHandler: requireSuperAdmin,
    schemas: { response: orchestratedAppListSchema },
    url: "/admin/app-operations"
  });

  registerContractRoute(app, {
    handler: async ({ params }) => {
      const item = await service.get(params.id);
      if (!item) {
        throw new AppError({
          code: "APP_NOT_FOUND",
          message: "Repository application bundle was not found.",
          statusCode: 404
        });
      }
      return item;
    },
    method: "GET",
    preHandler: requireSuperAdmin,
    schemas: { params: orchestratedAppParamsSchema, response: orchestratedAppSchema },
    url: "/admin/app-operations/:id"
  });
}
