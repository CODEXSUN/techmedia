import { z } from "zod";

const frappeBaseUrlSchema = z
  .string()
  .trim()
  .min(1, "Frappe URL is required.")
  .max(500)
  .refine(isHttpUrl, "Enter a valid HTTP or HTTPS Frappe URL.");

export const frappeConnectionSchema = z
  .object({
    appKey: z.string().trim().max(2_000).optional(),
    appSecret: z.string().trim().max(2_000).optional(),
    baseUrl: frappeBaseUrlSchema,
    connectionName: z.string().trim().min(2, "Connection name is required.").max(160),
    enabled: z.boolean()
  })
  .strict()
  .superRefine(validateCredentialPair);

export const frappeConnectionVerificationSchema = z
  .object({
    appKey: z.string().trim().max(2_000).optional(),
    appSecret: z.string().trim().max(2_000).optional(),
    baseUrl: frappeBaseUrlSchema
  })
  .strict()
  .superRefine(validateCredentialPair);

function validateCredentialPair(
  value: { appKey?: string | undefined; appSecret?: string | undefined },
  context: z.RefinementCtx
) {
  if (Boolean(value.appKey) === Boolean(value.appSecret)) return;
  const missingField = value.appKey ? "appSecret" : "appKey";
  context.addIssue({
    code: "custom",
    message: `Frappe ${missingField === "appKey" ? "app key" : "app secret"} is required.`,
    path: [missingField]
  });
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}
