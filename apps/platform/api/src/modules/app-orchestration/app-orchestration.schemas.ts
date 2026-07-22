import { z } from "zod";

const orchestratedComponentSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1)
});

const orchestratedServiceSchema = z.object({
  host: z.string().min(1),
  id: z.enum(["api", "web"]),
  label: z.string().min(1),
  managedPid: z.number().int().nullable(),
  online: z.boolean(),
  port: z.number().int().positive(),
  responseMs: z.number().nonnegative().nullable(),
  uptimeSeconds: z.number().nonnegative().nullable()
});

export const orchestratedAppSchema = z.object({
  components: z.array(orchestratedComponentSchema),
  description: z.string(),
  id: z.string().min(1),
  kind: z.enum(["bundle", "runtime"]),
  label: z.string().min(1),
  lastAction: z.string().nullable(),
  managed: z.boolean(),
  packageName: z.string().min(1),
  readiness: z.enum(["active", "boundary", "runtime"]),
  services: z.array(orchestratedServiceSchema),
  status: z.enum(["connected", "offline", "online", "partial"]),
  terminalPid: z.number().int().nullable(),
  uptimeSeconds: z.number().nonnegative().nullable()
});

export const orchestratedAppListSchema = z.array(orchestratedAppSchema);

export const orchestratedAppParamsSchema = z
  .object({
    id: z.string().trim().min(1)
  })
  .strict();
