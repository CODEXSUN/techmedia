import { randomUUID } from "node:crypto";
import { sql, type Kysely } from "kysely";
import { AppError } from "@codexsun/framework/errors";
import type { TechMediaDatabase } from "../../database/schema.js";
import type {
  NotificationContext,
  NotificationEvent,
  NotificationInboxItem,
  NotificationPublisher
} from "./notification.types.js";

export function createNotificationPublisher(database: Kysely<TechMediaDatabase>): NotificationPublisher {
  return new DatabaseNotificationPublisher(database);
}

export class NotificationService {
  constructor(private readonly context: NotificationContext) {}

  async inbox(): Promise<NotificationInboxItem[]> {
    const actor = await this.requireActor();
    const records = await this.context.database
      .selectFrom("notifications")
      .select(["id", "event_type", "title", "body", "resource_id", "created_at"])
      .where("recipient_user_id", "=", actor.id)
      .where("status", "=", "unread")
      .orderBy("created_at", "desc")
      .limit(50)
      .execute();
    if (records.length) {
      await this.context.database
        .updateTable("notification_outbox")
        .set({ attempts: sql`attempts + 1`, delivered_at: new Date(), status: "delivered" })
        .where("notification_id", "in", records.map((record) => record.id))
        .where("status", "=", "pending")
        .execute();
    }
    return records.map(toInboxItem);
  }

  async markRead(id: number): Promise<NotificationInboxItem> {
    const actor = await this.requireActor();
    const record = await this.context.database
      .selectFrom("notifications")
      .select(["id", "event_type", "title", "body", "resource_id", "created_at"])
      .where("id", "=", id)
      .where("recipient_user_id", "=", actor.id)
      .executeTakeFirst();
    if (!record) throw AppError.notFound("Notification was not found.");
    await this.context.database
      .updateTable("notifications")
      .set({ read_at: new Date(), status: "read" })
      .where("id", "=", id)
      .execute();
    return toInboxItem(record);
  }

  private async requireActor() {
    const actor = await this.context.actorUser();
    if (!actor) throw AppError.unauthorized("An active user is required.");
    return actor;
  }
}

class DatabaseNotificationPublisher implements NotificationPublisher {
  constructor(private readonly database: Kysely<TechMediaDatabase>) {}

  async enqueue(input: NotificationEvent) {
    if (!input.recipientEmployeeCode?.trim()) return;
    const recipient = await this.database
      .selectFrom("users")
      .select("id")
      .where("frappe_employee_code", "=", input.recipientEmployeeCode.trim())
      .where("status", "=", "active")
      .executeTakeFirst();
    if (!recipient || recipient.id === input.actorUserId) return;
    const inserted = await this.database
      .insertInto("notifications")
      .values({
        actor_user_id: input.actorUserId,
        body: input.body.slice(0, 1000),
        event_type: input.type,
        recipient_user_id: recipient.id,
        resource_id: input.resourceId,
        title: input.title.slice(0, 220),
        uuid: randomUUID()
      })
      .executeTakeFirstOrThrow();
    await this.database
      .insertInto("notification_outbox")
      .values({ notification_id: Number(inserted.insertId), uuid: randomUUID() })
      .execute();
  }

  async unreadAssignmentResourceIds(recipientUserId: number): Promise<Set<string>> {
    const records = await this.database
      .selectFrom("notifications")
      .select("resource_id")
      .where("recipient_user_id", "=", recipientUserId)
      .where("event_type", "=", "assignment")
      .where("status", "=", "unread")
      .execute();
    return new Set(records.map((record) => record.resource_id));
  }

  async claimUnreadAssignments(recipientUserId: number, resourceId: string): Promise<number[]> {
    const notifications = await this.database
      .selectFrom("notifications")
      .select("id")
      .where("recipient_user_id", "=", recipientUserId)
      .where("resource_id", "=", resourceId)
      .where("event_type", "=", "assignment")
      .where("status", "=", "unread")
      .execute();
    const claimed: number[] = [];
    for (const notification of notifications) {
      const result = await this.database
        .updateTable("notifications")
        .set({ read_at: new Date(), status: "read" })
        .where("id", "=", notification.id)
        .where("recipient_user_id", "=", recipientUserId)
        .where("status", "=", "unread")
        .executeTakeFirst();
      if (Number(result.numUpdatedRows) > 0) claimed.push(notification.id);
    }
    return claimed;
  }

  async restoreUnreadAssignments(recipientUserId: number, notificationIds: number[]): Promise<void> {
    if (!notificationIds.length) return;
    await this.database
      .updateTable("notifications")
      .set({ read_at: null, status: "unread" })
      .where("id", "in", notificationIds)
      .where("recipient_user_id", "=", recipientUserId)
      .where("event_type", "=", "assignment")
      .execute();
  }
}

function toInboxItem(record: {
  body: string;
  created_at: Date;
  event_type: string;
  id: number;
  resource_id: string;
  title: string;
}): NotificationInboxItem {
  return {
    body: record.body,
    createdAt: record.created_at.toISOString(),
    id: record.id,
    resourceId: record.resource_id,
    title: record.title,
    type: record.event_type as NotificationInboxItem["type"]
  };
}
