import { loadEnv } from "@codexsun/framework/env";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  AUTH_MODE: z.enum(["cookie", "jwt", "hybrid"]).default("jwt"),
  PLATFORM_API_PORT: z.coerce.number().int().positive(),
  PLATFORM_API_URL: z.string().url("PLATFORM_API_URL must be a valid URL"),
  PLATFORM_WEB_PORT: z.coerce.number().int().positive().default(7060),
  PLATFORM_WEB_ORIGIN: z.string().url("PLATFORM_WEB_ORIGIN must be a valid URL"),
  PLATFORM_WEB_ORIGINS: z.string().default(""),
  PLATFORM_WEB_HEALTH_URL: z.union([z.literal(""), z.string().url()]).default(""),
  DB_HOST: z.string().default("127.0.0.1"),
  DB_PORT: z.coerce.number().int().positive(),
  DB_USER: z.string().min(1, "DB_USER is required"),
  DB_PASSWORD: z.string(),
  DB_DRIVER: z.enum(["mariadb", "mysql2"]).default("mariadb"),
  DB_NAME: z.string().min(1, "DB_NAME is required"),
  TECHMEDIA_DB_FRESH_ON_START: z.enum(["0", "1"]).default("0"),
  TECHMEDIA_DB_RESET_CONFIRM: z.string().default(""),
  TECHMEDIA_ALLOW_PRODUCTION_DB_RESET: z.enum(["0", "1"]).default("0"),
  TECHMEDIA_ENV_FILE_PATH: z.string().default(""),
  TECHMEDIA_INTEGRATION_ENCRYPTION_KEY: z.string().default(""),
  DEV_AUTO_LOGIN: z.enum(["0", "1"]).default("0"),
  INITIAL_ADMIN_EMAIL: z.string().default(""),
  INITIAL_ADMIN_NAME: z.string().default(""),
  INITIAL_ADMIN_PASSWORD: z.string().default(""),
  FRAPPE_APP_KEY: z.string().default(""),
  FRAPPE_APP_SECRET: z.string().default(""),
  FRAPPE_BASE_URL: z.string().default(""),
  FRAPPE_CONNECTION_NAME: z.string().default("Frappe"),
  FRAPPE_ENABLED: z.enum(["0", "1"]).default("1"),
  FRAPPE_LAST_CHECKED_AT: z.string().default(""),
  FRAPPE_LAST_VERIFIED_AT: z.string().default(""),
  FRAPPE_UPDATED_AT: z.string().default(""),
  FRAPPE_VERIFICATION_STATUS: z.enum(["live", "offline", "unverified"]).default("unverified"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required")
});

export const env = loadEnv(envSchema);
