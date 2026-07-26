import { sql, type Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";
import type {
  CrmEnquiryActivity,
  CrmEnquiryAttachment,
  CrmEnquiryAttachmentCreatePayload,
  CrmEnquiryCall,
  CrmEnquiryCallCreatePayload,
  CrmEnquiryEmail,
  CrmEnquiryEmailCreatePayload,
  CrmEnquiryListFilters,
  CrmEnquiryLifecycleStatus,
  CrmEnquiryMessageCreatePayload,
  CrmEnquiryNote,
  CrmEnquiryNoteCreatePayload,
  CrmEnquiryPriority,
  CrmEnquirySavePayload,
  CrmEnquirySchedule,
  CrmEnquiryStatus,
  CrmStoredEnquiryMessage,
  CrmEnquiryTask,
  CrmEnquiryTaskCreatePayload
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
  subject: string;
  title: string;
  updated_at: Date | string;
  uuid: string;
  workspace: string;
};

type StoredEnquiry = ReturnType<typeof mapEnquiry> & {
  activities: CrmEnquiryActivity[];
  attachments: CrmEnquiryAttachment[];
  calls: CrmEnquiryCall[];
  emails: CrmEnquiryEmail[];
  messages: CrmStoredEnquiryMessage[];
  notes: CrmEnquiryNote[];
  schedules: CrmEnquirySchedule[];
  tasks: CrmEnquiryTask[];
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
      await sql<EnquiryRow>`SELECT id,uuid,title,subject,priority,status,lifecycle_status,assigned_to_user_id,
      created_by_user_id,mobile,customer,enquiry_group,enquiry_date,workspace,created_at,updated_at FROM crm_enquiries
      WHERE ${viewCondition}
        AND (${filters.enquiryId ?? 0}=0 OR id=${filters.enquiryId ?? 0})
        AND (${filters.search ?? ""}='' OR LOWER(title) LIKE ${term} OR LOWER(subject) LIKE ${term} OR CAST(id AS CHAR) LIKE ${term})
      ORDER BY updated_at DESC,id DESC`.execute(this.database);
    return this.withSchedules(result.rows.map(mapEnquiry));
  }

  async find(id: number) {
    const result =
      await sql<EnquiryRow>`SELECT id,uuid,title,subject,priority,status,lifecycle_status,assigned_to_user_id,
      created_by_user_id,mobile,customer,enquiry_group,enquiry_date,workspace,created_at,updated_at
      FROM crm_enquiries WHERE id=${id} LIMIT 1`.execute(this.database);
    const record = result.rows[0] ? mapEnquiry(result.rows[0]) : null;
    if (!record) return null;
    return {
      ...record,
      activities: await this.listActivities(record.id),
      attachments: await this.listAttachments(record.id),
      calls: await this.listCalls(record.id),
      emails: await this.listEmails(record.id),
      messages: await this.listMessages(record.id),
      notes: await this.listNotes(record.id),
      schedules: await this.listSchedules(record.id),
      tasks: await this.listTasks(record.id)
    };
  }

  async create(input: CrmEnquirySavePayload, createdByUserId: number, uuid: string) {
    const result = await sql`INSERT INTO crm_enquiries
      (uuid,title,subject,priority,status,assigned_to_user_id,created_by_user_id,mobile,customer,enquiry_group,enquiry_date,workspace)
      VALUES (${uuid},${input.title},${input.subject ?? ""},${input.priority},${input.status},${input.assignedToUserId},${createdByUserId},
        ${input.mobile},${input.customer},${input.enquiryGroup},${input.enquiryDate},${input.workspace})`.execute(
      this.database
    );
    const id = Number(result.insertId);
    await this.replaceMessages(id, input.messages);
    await this.replaceSchedules(id, input.schedules);
    return (await this.find(id))!;
  }

  async update(id: number, input: CrmEnquirySavePayload, replaceMessages = false) {
    await sql`UPDATE crm_enquiries SET title=${input.title},subject=${input.subject ?? ""},priority=${input.priority},status=${input.status},
      assigned_to_user_id=${input.assignedToUserId},mobile=${input.mobile},customer=${input.customer},
      enquiry_group=${input.enquiryGroup},enquiry_date=${input.enquiryDate},workspace=${input.workspace}
      WHERE id=${id}`.execute(this.database);
    if (replaceMessages) await this.replaceMessages(id, input.messages);
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

  async addMessage(
    enquiryId: number,
    input: CrmEnquiryMessageCreatePayload,
    createdByUserId: number
  ) {
    const positionResult = await sql<{ next_position: number | string }>`SELECT
      COALESCE(MAX(position),-1)+1 AS next_position
      FROM crm_enquiry_messages WHERE enquiry_id=${enquiryId}`.execute(this.database);
    await sql`INSERT INTO crm_enquiry_messages
      (enquiry_id,position,message_type,comment,created_by_user_id)
      VALUES (${enquiryId},${Number(positionResult.rows[0]?.next_position ?? 0)},${input.messageType},
        ${input.comment},${createdByUserId})`.execute(this.database);
    return this.find(enquiryId);
  }

  async updateLatestMessage(
    enquiryId: number,
    messageId: number,
    createdByUserId: number,
    comment: string
  ) {
    const result = await sql`UPDATE crm_enquiry_messages
      SET comment=${comment}
      WHERE enquiry_id=${enquiryId}
        AND id=${messageId}
        AND created_by_user_id=${createdByUserId}
        AND id=(
          SELECT latest.id FROM (
            SELECT id FROM crm_enquiry_messages
            WHERE enquiry_id=${enquiryId}
            ORDER BY position DESC,id DESC
            LIMIT 1
          ) AS latest
        )`.execute(this.database);
    return Number(result.numAffectedRows ?? 0) > 0;
  }

  async deleteLatestMessage(enquiryId: number, messageId: number, createdByUserId: number) {
    const result = await sql`DELETE FROM crm_enquiry_messages
      WHERE enquiry_id=${enquiryId}
        AND id=${messageId}
        AND created_by_user_id=${createdByUserId}
        AND id=(
          SELECT latest.id FROM (
            SELECT id FROM crm_enquiry_messages
            WHERE enquiry_id=${enquiryId}
            ORDER BY position DESC,id DESC
            LIMIT 1
          ) AS latest
        )`.execute(this.database);
    return Number(result.numAffectedRows ?? 0) > 0;
  }

  async addEmail(
    enquiryId: number,
    input: CrmEnquiryEmailCreatePayload,
    createdByUserId: number,
    uuid: string
  ) {
    await sql`INSERT INTO crm_enquiry_emails
      (uuid,enquiry_id,recipient,subject,body,created_by_user_id)
      VALUES (${uuid},${enquiryId},${input.recipient},${input.subject},${input.body},
        ${createdByUserId})`.execute(this.database);
    return this.find(enquiryId);
  }

  async addCall(
    enquiryId: number,
    input: CrmEnquiryCallCreatePayload,
    createdByUserId: number,
    uuid: string
  ) {
    await sql`INSERT INTO crm_enquiry_calls
      (uuid,enquiry_id,phone,summary,called_at,created_by_user_id)
      VALUES (${uuid},${enquiryId},${input.phone},${input.summary},${new Date(input.calledAt)},
        ${createdByUserId})`.execute(this.database);
    return this.find(enquiryId);
  }

  async addTask(
    enquiryId: number,
    input: CrmEnquiryTaskCreatePayload,
    createdByUserId: number,
    uuid: string
  ) {
    await sql`INSERT INTO crm_enquiry_tasks
      (uuid,enquiry_id,title,task_status,due_on,created_by_user_id)
      VALUES (${uuid},${enquiryId},${input.title},${input.status},${input.dueOn},
        ${createdByUserId})`.execute(this.database);
    return this.find(enquiryId);
  }

  async addNote(
    enquiryId: number,
    input: CrmEnquiryNoteCreatePayload,
    createdByUserId: number,
    uuid: string
  ) {
    await sql`INSERT INTO crm_enquiry_notes (uuid,enquiry_id,note,created_by_user_id)
      VALUES (${uuid},${enquiryId},${input.note},${createdByUserId})`.execute(this.database);
    return this.find(enquiryId);
  }

  async addAttachment(
    enquiryId: number,
    input: CrmEnquiryAttachmentCreatePayload,
    createdByUserId: number,
    uuid: string
  ) {
    await sql`INSERT INTO crm_enquiry_attachments
      (uuid,enquiry_id,file_name,file_url,created_by_user_id)
      VALUES (${uuid},${enquiryId},${input.fileName},${input.fileUrl},
        ${createdByUserId})`.execute(this.database);
    return this.find(enquiryId);
  }

  async addActivity(
    enquiryId: number,
    action: string,
    details: string,
    createdByUserId: number,
    uuid: string
  ) {
    await sql`INSERT INTO crm_enquiry_activities
      (uuid,enquiry_id,action,details,created_by_user_id)
      VALUES (${uuid},${enquiryId},${action},${details},${createdByUserId})`.execute(this.database);
  }

  async listReferences() {
    const result = await sql<
      Pick<EnquiryRow, "id" | "title">
    >`SELECT id,COALESCE(NULLIF(subject,''),title) AS title
      FROM crm_enquiries WHERE lifecycle_status='active' ORDER BY id DESC`.execute(this.database);
    return result.rows.map((row) => ({ id: Number(row.id), title: row.title }));
  }

  async listAll() {
    const result =
      await sql<EnquiryRow>`SELECT id,uuid,title,subject,priority,status,lifecycle_status,assigned_to_user_id,
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

  private async listMessages(enquiryId: number): Promise<CrmStoredEnquiryMessage[]> {
    const result = await sql<{
      comment: string;
      created_at: Date | string;
      created_by_user_id: number | null;
      id: number;
      message_type: "comment" | "reply";
    }>`SELECT id,message_type,comment,created_by_user_id,created_at
      FROM crm_enquiry_messages WHERE enquiry_id=${enquiryId} ORDER BY position,id`.execute(
      this.database
    );
    return result.rows.map((row) => ({
      comment: row.comment,
      createdAt: timestamp(row.created_at),
      createdByUserId: row.created_by_user_id === null ? null : Number(row.created_by_user_id),
      id: Number(row.id),
      messageType: row.message_type
    }));
  }

  private async listEmails(enquiryId: number): Promise<CrmEnquiryEmail[]> {
    const result = await sql<{
      body: string;
      created_at: Date | string;
      created_by_user_id: number;
      id: number;
      recipient: string;
      subject: string;
      uuid: string;
    }>`SELECT id,uuid,recipient,subject,body,created_by_user_id,created_at
      FROM crm_enquiry_emails WHERE enquiry_id=${enquiryId} ORDER BY created_at DESC,id DESC`.execute(
      this.database
    );
    return result.rows.map((row) => ({
      body: row.body,
      createdAt: timestamp(row.created_at),
      createdByUserId: Number(row.created_by_user_id),
      id: Number(row.id),
      recipient: row.recipient,
      subject: row.subject,
      uuid: row.uuid
    }));
  }

  private async listCalls(enquiryId: number): Promise<CrmEnquiryCall[]> {
    const result = await sql<{
      called_at: Date | string;
      created_at: Date | string;
      created_by_user_id: number;
      id: number;
      phone: string;
      summary: string;
      uuid: string;
    }>`SELECT id,uuid,phone,summary,called_at,created_by_user_id,created_at
      FROM crm_enquiry_calls WHERE enquiry_id=${enquiryId} ORDER BY called_at DESC,id DESC`.execute(
      this.database
    );
    return result.rows.map((row) => ({
      calledAt: timestamp(row.called_at),
      createdAt: timestamp(row.created_at),
      createdByUserId: Number(row.created_by_user_id),
      id: Number(row.id),
      phone: row.phone,
      summary: row.summary,
      uuid: row.uuid
    }));
  }

  private async listTasks(enquiryId: number): Promise<CrmEnquiryTask[]> {
    const result = await sql<{
      created_at: Date | string;
      created_by_user_id: number;
      due_on: Date | string | null;
      id: number;
      task_status: "completed" | "pending";
      title: string;
      uuid: string;
    }>`SELECT id,uuid,title,task_status,due_on,created_by_user_id,created_at
      FROM crm_enquiry_tasks WHERE enquiry_id=${enquiryId}
      ORDER BY task_status,due_on IS NULL,due_on,id DESC`.execute(this.database);
    return result.rows.map((row) => ({
      createdAt: timestamp(row.created_at),
      createdByUserId: Number(row.created_by_user_id),
      dueOn: row.due_on ? dateOnly(row.due_on) : null,
      id: Number(row.id),
      status: row.task_status,
      title: row.title,
      uuid: row.uuid
    }));
  }

  private async listNotes(enquiryId: number): Promise<CrmEnquiryNote[]> {
    const result = await sql<{
      created_at: Date | string;
      created_by_user_id: number;
      id: number;
      note: string;
      uuid: string;
    }>`SELECT id,uuid,note,created_by_user_id,created_at
      FROM crm_enquiry_notes WHERE enquiry_id=${enquiryId} ORDER BY created_at DESC,id DESC`.execute(
      this.database
    );
    return result.rows.map((row) => ({
      createdAt: timestamp(row.created_at),
      createdByUserId: Number(row.created_by_user_id),
      id: Number(row.id),
      note: row.note,
      uuid: row.uuid
    }));
  }

  private async listAttachments(enquiryId: number): Promise<CrmEnquiryAttachment[]> {
    const result = await sql<{
      created_at: Date | string;
      created_by_user_id: number;
      file_name: string;
      file_url: string;
      id: number;
      uuid: string;
    }>`SELECT id,uuid,file_name,file_url,created_by_user_id,created_at
      FROM crm_enquiry_attachments WHERE enquiry_id=${enquiryId}
      ORDER BY created_at DESC,id DESC`.execute(this.database);
    return result.rows.map((row) => ({
      createdAt: timestamp(row.created_at),
      createdByUserId: Number(row.created_by_user_id),
      fileName: row.file_name,
      fileUrl: row.file_url,
      id: Number(row.id),
      uuid: row.uuid
    }));
  }

  private async listActivities(enquiryId: number): Promise<CrmEnquiryActivity[]> {
    const result = await sql<{
      action: string;
      created_at: Date | string;
      created_by_user_id: number;
      details: string;
      id: number;
      uuid: string;
    }>`SELECT id,uuid,action,details,created_by_user_id,created_at
      FROM crm_enquiry_activities WHERE enquiry_id=${enquiryId}
      ORDER BY created_at DESC,id DESC`.execute(this.database);
    return result.rows.map((row) => ({
      action: row.action,
      createdAt: timestamp(row.created_at),
      createdByUserId: Number(row.created_by_user_id),
      details: row.details,
      id: Number(row.id),
      uuid: row.uuid
    }));
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

  private async withChildren(
    records: Array<
      Omit<
        StoredEnquiry,
        | "activities"
        | "attachments"
        | "calls"
        | "emails"
        | "messages"
        | "notes"
        | "schedules"
        | "tasks"
      >
    >
  ) {
    return Promise.all(
      records.map(async (record) => ({
        ...record,
        activities: await this.listActivities(record.id),
        attachments: await this.listAttachments(record.id),
        calls: await this.listCalls(record.id),
        emails: await this.listEmails(record.id),
        messages: await this.listMessages(record.id),
        notes: await this.listNotes(record.id),
        schedules: await this.listSchedules(record.id),
        tasks: await this.listTasks(record.id)
      }))
    );
  }

  private withSchedules(
    records: Array<
      Omit<
        StoredEnquiry,
        | "activities"
        | "attachments"
        | "calls"
        | "emails"
        | "messages"
        | "notes"
        | "schedules"
        | "tasks"
      >
    >
  ) {
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
    subject: row.subject,
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
