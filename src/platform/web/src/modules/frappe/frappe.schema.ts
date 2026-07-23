import { z } from "zod";

export const frappeConnectionSchema = z
  .object({
    apiKey: z.string().trim().max(2_000, "API key is too long."),
    apiSecret: z.string().trim().max(2_000, "API secret is too long."),
    baseUrl: z
      .string()
      .trim()
      .min(1, "Frappe URL is required.")
      .max(500)
      .refine(isHttpUrl, "Enter a valid HTTP or HTTPS Frappe URL."),
    connectionName: z.string().trim().min(2, "Connection name is required.").max(160),
    enabled: z.boolean()
  })
  .strict();

export const frappeConnectionVerificationSchema = frappeConnectionSchema.pick({
  apiKey: true,
  apiSecret: true,
  baseUrl: true
});

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}
