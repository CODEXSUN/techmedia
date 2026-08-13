import { AppError } from "@codexsun/framework/errors";
import type { ReturnTypeIdentityContext } from "./honey.types.js";

const globalAvailabilityKey = "global-availability";

export class HoneySettingsService {
  constructor(private readonly context: ReturnTypeIdentityContext) {}

  async availability() {
    await this.requireActor();
    const setting = await this.context.database
      .selectFrom("ai_honey_settings")
      .select("enabled")
      .where("setting_key", "=", globalAvailabilityKey)
      .executeTakeFirstOrThrow();
    return { enabled: Boolean(setting.enabled) };
  }

  async updateAvailability(enabled: boolean) {
    await this.requireSystemAdmin();
    await this.context.database
      .updateTable("ai_honey_settings")
      .set({ enabled })
      .where("setting_key", "=", globalAvailabilityKey)
      .execute();
    return { enabled };
  }

  async requireEnabled() {
    const setting = await this.availability();
    if (!setting.enabled) {
      throw new AppError({
        code: "AI_TEMA_DISABLED",
        message: "TEMA is disabled by the system administrator.",
        statusCode: 503
      });
    }
  }

  private async requireActor() {
    const actor = await this.context.actorUser();
    if (!actor) throw AppError.unauthorized("An active user is required.");
    return actor;
  }

  private async requireSystemAdmin() {
    const actor = await this.requireActor();
    if (actor.role !== "super-admin") {
      throw AppError.forbidden("System administrator access is required.");
    }
    return actor;
  }
}
