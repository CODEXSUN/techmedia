import { z } from "zod";
export const tenantUserSchema = z
  .object({
    confirmPassword: z.string().max(128).optional().or(z.literal("")),
    email: z.string().trim().email("A valid email is required."),
    frappeApiKey: z.string().trim().max(2_000, "Frappe API key is too long.").optional(),
    frappeApiSecret: z.string().trim().max(2_000, "Frappe API secret is too long.").optional(),
    name: z.string().trim().min(2, "User name is required.").max(180),
    password: z
      .string()
      .min(8, "Password must contain at least 8 characters.")
      .max(128)
      .optional()
      .or(z.literal("")),
    status: z.enum(["active", "inactive", "suspended"])
  })
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({
        code: "custom",
        message: "Password and confirm password must match.",
        path: ["confirmPassword"]
      });
    }
  });
