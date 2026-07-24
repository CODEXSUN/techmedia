import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "@codexsun/framework/errors";
import { fail } from "@codexsun/framework/http";
import { verifyAuthToken } from "./jwt.js";

export async function requireSuperAdmin(request: FastifyRequest, reply: FastifyReply) {
  const payload = superAdminPayload(request);
  if (payload?.userType === "super_admin") {
    return;
  }

  return reply.code(403).send(
    fail(
      {
        code: "SUPER_ADMIN_REQUIRED",
        message: "Super Admin permission is required for this operation."
      },
      { requestId: request.id }
    )
  );
}

export function superAdminActorEmail(request: FastifyRequest) {
  const payload = superAdminPayload(request);
  if (payload?.userType !== "super_admin") {
    throw AppError.forbidden("Super Admin permission is required for this operation.");
  }
  return payload.email;
}

function superAdminPayload(request: FastifyRequest) {
  const token = bearerToken(request);
  return token ? verifyAuthToken(token) : null;
}

function bearerToken(request: FastifyRequest) {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) return "";
  return authorization.slice("Bearer ".length).trim();
}
