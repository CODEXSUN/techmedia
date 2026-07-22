import type { Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";

export async function seedQueueManagerModule(_db: Kysely<PlatformDatabase>) {
  return { backend: "database", seeded: 0 } as const;
}
