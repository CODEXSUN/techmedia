import { z } from "zod";
export const orchestratedAppIdSchema = z.string().trim().min(1);
