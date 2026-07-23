import type { Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";
import { env } from "../../env.js";

export async function seedQueueManagerModule(db: Kysely<PlatformDatabase>) {
  const result = await db
    .insertInto("queue_runtime_settings")
    .ignore()
    .values({
      backend: env.TECHMEDIA_QUEUE_BACKEND,
      setting_key: "primary",
      updated_by: null,
      uuid: "00000001"
    })
    .executeTakeFirst();
  return {
    backend: env.TECHMEDIA_QUEUE_BACKEND,
    seeded: Number(result.numInsertedOrUpdatedRows ?? 0)
  } as const;
}
