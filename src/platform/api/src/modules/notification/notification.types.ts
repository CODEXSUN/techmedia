import type { Kysely } from "kysely";
import type { TechMediaDatabase } from "../../database/schema.js";

export type NotificationEventType = "assignment" | "comment" | "reply" | "status";

export type NotificationEvent = {
  actorUserId: number;
  body: string;
  recipientEmployeeCode: string | null;
  resourceId: string;
  title: string;
  type: NotificationEventType;
};

export type NotificationPublisher = {
  enqueue(input: NotificationEvent): Promise<void>;
};

export type NotificationContext = {
  actorUser: () => Promise<{ id: number } | undefined>;
  database: Kysely<TechMediaDatabase>;
};

export type NotificationInboxItem = {
  body: string;
  createdAt: string;
  id: number;
  resourceId: string;
  title: string;
  type: NotificationEventType;
};
