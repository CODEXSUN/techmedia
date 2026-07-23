import { sql, type Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";
import type {
  CrmEnquiryListFilters,
  CrmEnquiryLifecycleStatus,
  CrmEnquiryPriority,
  CrmEnquirySavePayload,
  CrmEnquirySchedule,
  CrmEnquiryStatus
} from "./crm.types.js";

type EnquiryRow = {
  assigned_to_user_id: number | null;
  created_at: Date | string;
  created_by_user_id: number;
  customer: string;
  enquiry_date: Date | string | null;
  enquiry_group: string;
  id: number;
  lifecycle_status: CrmEnquiryLifecycleStatus;
  mobile: string;
  priority: CrmEnquiryPriority;
  status: CrmEnquiryStatus;
  title: string;
  updated_at: Date | string;
  uuid: string;
  workspace: string;
};

type StoredEnquiry = ReturnType<typeof mapEnquiry> & {
  messages: Array<{ comment: string; id: number }>;
  schedules: CrmEnquirySchedule[];
};

export type CrmOverviewVisibility = {
  assigned: boolean;
  created: boolean;
  open: boolean;
};

export class CrmRepository {
  constructor(private readonly database: Kysely<TenantDatabase>) {}

  async list(filters: CrmEnquiryListFilters, actorUserId: number) {
    const term = `%${(filters.search ?? "").trim().toLowerCase()}%`;
    const viewCondition =
      filters.view === "assigned"
        ? sql<boolean>`assigned_to_user_id=${actorUserId}`
        : filters.view === "created"
          ? sql<boolean>`created_by_user_id=${actorUserId}`
          : sql<boolean>`assigned_to_user_id IS NULL
              AND status IN ('open','follow','escalation')
              AND lifecycle_status='active'`;
    const result =
      await sql<EnquiryRow>`SELECT id,uuid,title,priority,status,lifecycle_status,assigned_to_user_id,
      created_by_user_id,mobile,customer,enquiry_group,enquiry_date,workspace,created_at,updated_at FROM crm_enquiries
      WHERE ${viewCondition}
        AND (${filters.enquiryId ?? 0}=0 OR id=${filters.enquiryId ?? 0})
        AND (${filters.search ?? ""}='' OR LOWER(title) LIKE ${term} OR CAST(id AS CHAR) LIKE ${term})
      ORDER BY updated_at DESC,id DESC`.execute(this.database);
    return this.withSchedules(result.rows.map(mapEnquiry));
  }

  async find(id: number) {
    const result =
      await sql<EnquiryRow>`SELECT id,uuid,title,priority,status,lifecycle_status,assigned_to_user_id,
      created_by_user_id,mobile,customer,enquiry_group,enquiry_date,workspace,created_at,updated_at
      FROM crm_enquiries WHERE id=${id} LIMIT 1`.execute(this.database);
    const record = result.rows[0] ? mapEnquiry(result.rows[0]) : null;
    if (!record) return null;
    return {
      ...record,
      messages: await this.listMessages(record.id),
      schedules: await this.listSchedules(record.id)
    };
  }

  async create(input: CrmEnquirySavePayload, createdByUserId: number, uuid: string) {
    const result = await sql`INSERT INTO crm_enquiries
      (uuid,title,priority,status,assigned_to_user_id,created_by_user_id,mobile,customer,enquiry_group,enquiry_date,workspace)
      VALUES (${uuid},${input.title},${input.priority},${input.status},${input.assignedToUserId},${createdByUserId},
        ${input.mobile},${input.customer},${input.enquiryGroup},${input.enquiryDate},${input.workspace})`.execute(
      this.database
    );
    const id = Number(result.insertId);
    await this.replaceMessages(id, input.messages);
    await this.replaceSchedules(id, input.schedules);
    return (await this.find(id))!;
  }

  async update(id: number, input: CrmEnquirySavePayload) {
    await sql`UPDATE crm_enquiries SET title=${input.title},priority=${input.priority},status=${input.status},
      assigned_to_user_id=${input.assignedToUserId},mobile=${input.mobile},customer=${input.customer},
      enquiry_group=${input.enquiryGroup},enquiry_date=${input.enquiryDate},workspace=${input.workspace}
      WHERE id=${id}`.execute(this.database);
    await this.replaceMessages(id, input.messages);
    await this.replaceSchedules(id, input.schedules);
    return this.find(id);
  }

  async setLifecycleStatus(id: number, lifecycleStatus: CrmEnquiryLifecycleStatus) {
    await sql`UPDATE crm_enquiries SET lifecycle_status=${lifecycleStatus} WHERE id=${id}`.execute(
      this.database
    );
    return this.find(id);
  }

  async forceDelete(id: number) {
    const record = await this.find(id);
    if (!record) return null;
    await sql`DELETE FROM crm_enquiries WHERE id=${id}`.execute(this.database);
    return record;
  }

  async listReferences() {
    const result = await sql<
      Pick<EnquiryRow, "id" | "title">
    >`SELECT id,title FROM crm_enquiries WHERE lifecycle_status='active' ORDER BY id DESC`.execute(
      this.database
    );
    return result.rows.map((row) => ({ id: Number(row.id), title: row.title }));
  }

  async listAll() {
    const result =
      await sql<EnquiryRow>`SELECT id,uuid,title,priority,status,lifecycle_status,assigned_to_user_id,
      created_by_user_id,mobile,customer,enquiry_group,enquiry_date,workspace,created_at,updated_at
      FROM crm_enquiries WHERE lifecycle_status='active' ORDER BY updated_at,id`.execute(
        this.database
      );
    return this.withChildren(result.rows.map(mapEnquiry));
  }

  async overview(actorUserId: number, visibility: CrmOverviewVisibility) {
    const visible = sql<boolean>`(
      (${visibility.assigned ? 1 : 0}=1 AND assigned_to_user_id=${actorUserId})
      OR (${visibility.created ? 1 : 0}=1 AND created_by_user_id=${actorUserId})
      OR (${visibility.open ? 1 : 0}=1
        AND assigned_to_user_id IS NULL
        AND status IN ('open','follow','escalation'))
    )`;
    const statsResult = await sql<{
      closed: number | string;
      in_progress: number | string;
      open: number | string;
      total: number | string;
    }>`SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status='open' THEN 1 ELSE 0 END) AS open,
      SUM(CASE WHEN status IN ('follow','escalation') THEN 1 ELSE 0 END) AS in_progress,
      SUM(CASE WHEN status IN ('won','lost') THEN 1 ELSE 0 END) AS closed
      FROM crm_enquiries WHERE ${visible} AND lifecycle_status='active'`.execute(this.database);
    const leaderboardResult = await sql<{
      active: number | string;
      assigned_to_user_id: number;
      closed: number | string;
      total: number | string;
    }>`SELECT
      assigned_to_user_id,
      COUNT(*) AS total,
      SUM(CASE WHEN status IN ('open','follow','escalation') THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN status IN ('won','lost') THEN 1 ELSE 0 END) AS closed
      FROM crm_enquiries
      WHERE ${visible} AND lifecycle_status='active' AND assigned_to_user_id IS NOT NULL
      GROUP BY assigned_to_user_id
      ORDER BY closed DESC,total DESC,assigned_to_user_id
      LIMIT 5`.execute(this.database);
    const stats = statsResult.rows[0];
    return {
      leaderboard: leaderboardResult.rows.map((row) => ({
        active: Number(row.active),
        assignedToUserId: Number(row.assigned_to_user_id),
        closed: Number(row.closed),
        total: Number(row.total)
      })),
      stats: {
        closed: Number(stats?.closed ?? 0),
        inProgress: Number(stats?.in_progress ?? 0),
        open: Number(stats?.open ?? 0),
        total: Number(stats?.total ?? 0)
      }
    };
  }

  private async listSchedules(enquiryId: number) {
    const result = await sql<{ id: number; scheduled_on: Date | string }>`SELECT id,scheduled_on
      FROM crm_enquiry_schedules WHERE enquiry_id=${enquiryId} ORDER BY scheduled_on,id`.execute(
      this.database
    );
    return result.rows.map((row) => ({
      id: Number(row.id),
      scheduledOn: dateOnly(row.scheduled_on)
    }));
  }

  private async listMessages(enquiryId: number) {
    const result = await sql<{ comment: string; id: number }>`SELECT id,comment
      FROM crm_enquiry_messages WHERE enquiry_id=${enquiryId} ORDER BY position,id`.execute(
      this.database
    );
    return result.rows.map((row) => ({ comment: row.comment, id: Number(row.id) }));
  }

  private async replaceMessages(enquiryId: number, messages: CrmEnquirySavePayload["messages"]) {
    await sql`DELETE FROM crm_enquiry_messages WHERE enquiry_id=${enquiryId}`.execute(
      this.database
    );
    for (const [position, message] of messages.entries()) {
      await sql`INSERT INTO crm_enquiry_messages (enquiry_id,position,comment)
        VALUES (${enquiryId},${position},${message.comment})`.execute(this.database);
    }
  }

  private async replaceSchedules(enquiryId: number, schedules: CrmEnquirySavePayload["schedules"]) {
    await sql`DELETE FROM crm_enquiry_schedules WHERE enquiry_id=${enquiryId}`.execute(
      this.database
    );
    for (const schedule of schedules) {
      await sql`INSERT INTO crm_enquiry_schedules (enquiry_id,scheduled_on)
        VALUES (${enquiryId},${schedule.scheduledOn})`.execute(this.database);
    }
  }

  private async withChildren(records: Array<Omit<StoredEnquiry, "messages" | "schedules">>) {
    return Promise.all(
      records.map(async (record) => ({
        ...record,
        messages: await this.listMessages(record.id),
        schedules: await this.listSchedules(record.id)
      }))
    );
  }

  private withSchedules(records: Array<Omit<StoredEnquiry, "messages" | "schedules">>) {
    return this.withChildren(records);
  }
}

function mapEnquiry(row: EnquiryRow) {
  return {
    assignedToUserId: row.assigned_to_user_id === null ? null : Number(row.assigned_to_user_id),
    createdAt: timestamp(row.created_at),
    createdByUserId: Number(row.created_by_user_id),
    customer: row.customer,
    enquiryDate: row.enquiry_date ? dateOnly(row.enquiry_date) : null,
    enquiryGroup: row.enquiry_group,
    id: Number(row.id),
    lifecycleStatus: row.lifecycle_status,
    mobile: row.mobile,
    priority: row.priority,
    status: row.status,
    title: row.title,
    updatedAt: timestamp(row.updated_at),
    uuid: row.uuid,
    workspace: row.workspace
  };
}

function timestamp(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function dateOnly(value: Date | string) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}
