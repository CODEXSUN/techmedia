import { z } from "zod";

export const crmEnquirySchema = z.object({
  assignedToUserId: z.number().int().positive().nullable(),
  customer: z.string().trim().max(220),
  enquiryDate: z.iso.date().nullable(),
  enquiryGroup: z.string().trim().max(80),
  messages: z
    .array(z.object({ comment: z.string().trim().min(1, "Message cannot be empty.").max(10_000) }))
    .max(100),
  mobile: z.string().trim().min(5, "Mobile is required.").max(40),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  schedules: z
    .array(z.object({ scheduledOn: z.iso.date("Choose a valid schedule date.") }))
    .max(20, "An enquiry can contain up to 20 schedule dates."),
  status: z.enum(["open", "follow", "escalation", "won", "lost"]),
  title: z.string().trim().min(2, "Title is required.").max(220),
  workspace: z.string().trim().max(100_000)
});
