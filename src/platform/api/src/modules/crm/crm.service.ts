import { randomBytes } from "node:crypto";
import { AppError } from "@codexsun/framework/errors";
import { recordTenantAccessAudit } from "../../database/tenant-access-audit.js";
import { tenantUserReferenceContract } from "../tenant-user/index.js";
import { CrmRepository } from "./crm.repository.js";
import type {
  CrmContext,
  CrmEnquiryExternalLifecycle,
  CrmEnquiryAttachmentCreatePayload,
  CrmEnquiryCallCreatePayload,
  CrmEnquiryEmailCreatePayload,
  CrmEnquiry,
  CrmEnquiryListFilters,
  CrmEnquiryMessageCreatePayload,
  CrmEnquiryMessageUpdatePayload,
  CrmEnquiryNoteCreatePayload,
  CrmEnquiryOverview,
  CrmEnquirySavePayload,
  CrmEnquirySyncInput,
  CrmEnquiryTaskCreatePayload,
  CrmEnquiryView,
  CrmUserReference
} from "./crm.types.js";

const viewPermissions: Record<CrmEnquiryView, string> = {
  assigned: "crm.enquiry.assigned.view",
  created: "crm.enquiry.created.view",
  open: "crm.enquiry.open.view"
};

export class CrmService {
  private readonly repository: CrmRepository;
  private readonly users;

  constructor(
    private readonly context: CrmContext,
    private readonly externalLifecycle: CrmEnquiryExternalLifecycle
  ) {
    this.repository = new CrmRepository(context.database);
    this.users = tenantUserReferenceContract(context.database);
  }

  async list(filters: CrmEnquiryListFilters) {
    await this.context.authorize(viewPermissions[filters.view]);
    const actor = await this.actor();
    return this.enrich(await this.repository.list(filters, actor.id));
  }

  async get(id: number) {
    const record = await this.repository.find(id);
    if (!record) throw AppError.notFound("Enquiry was not found.");
    await this.authorizeRecord(record);
    return this.enrichOne(record);
  }

  async overview(): Promise<CrmEnquiryOverview> {
    await this.requireAnyView();
    const actor = await this.actor();
    const visibility = {
      assigned: await this.context.can(viewPermissions.assigned),
      created: await this.context.can(viewPermissions.created),
      open: await this.context.can(viewPermissions.open)
    };
    const overview = await this.repository.overview(actor.id, visibility);
    const leaderboard: CrmEnquiryOverview["leaderboard"] = [];
    for (const row of overview.leaderboard) {
      const user = await this.users.find(row.assignedToUserId);
      if (!user) continue;
      leaderboard.push({
        active: row.active,
        closed: row.closed,
        completionRate: row.total === 0 ? 0 : Math.round((row.closed / row.total) * 100),
        total: row.total,
        user: user satisfies CrmUserReference
      });
    }
    return { leaderboard, stats: overview.stats };
  }

  async create(input: CrmEnquirySavePayload) {
    await this.context.authorize("crm.enquiry.create");
    const actor = await this.actor();
    const value = await this.normalize(input);
    if (
      value.assignedToUserId !== null &&
      value.assignedToUserId !== actor.id &&
      !(await this.context.can("crm.enquiry.assign"))
    ) {
      throw AppError.forbidden("Permission crm.enquiry.assign is required to assign another user.");
    }
    const record = await this.repository.create(value, actor.id, randomBytes(4).toString("hex"));
    await this.audit("created", record);
    await this.externalLifecycle.upsert(record.id, actor.id);
    return this.enrichOne(record);
  }

  async update(id: number, input: CrmEnquirySavePayload) {
    await this.context.authorize("crm.enquiry.update");
    const current = await this.repository.find(id);
    if (!current) throw AppError.notFound("Enquiry was not found.");
    await this.authorizeRecord(current);
    if (current.lifecycleStatus === "suspended") {
      throw AppError.conflict("Restore the enquiry before editing it.");
    }
    if (
      input.assignedToUserId !== current.assignedToUserId &&
      !(await this.context.can("crm.enquiry.assign"))
    ) {
      throw AppError.forbidden("Permission crm.enquiry.assign is required to reassign enquiries.");
    }
    const record = (await this.repository.update(id, await this.normalize(input)))!;
    await this.audit("updated", record);
    await this.externalLifecycle.upsert(record.id, (await this.actor()).id);
    return this.enrichOne(record);
  }

  async suspend(id: number) {
    await this.context.authorize("crm.enquiry.suspend");
    const current = await this.repository.find(id);
    if (!current) throw AppError.notFound("Enquiry was not found.");
    await this.authorizeRecord(current);
    if (current.lifecycleStatus === "suspended") return this.enrichOne(current);
    const record = (await this.repository.setLifecycleStatus(id, "suspended"))!;
    await this.audit("suspended", record);
    return this.enrichOne(record);
  }

  async restore(id: number) {
    await this.context.authorize("crm.enquiry.suspend");
    const current = await this.repository.find(id);
    if (!current) throw AppError.notFound("Enquiry was not found.");
    await this.authorizeRecord(current);
    if (current.lifecycleStatus === "active") return this.enrichOne(current);
    const record = (await this.repository.setLifecycleStatus(id, "active"))!;
    await this.audit("restored", record);
    return this.enrichOne(record);
  }

  async resync(id: number) {
    await this.context.authorize("crm.enquiry.update");
    const actor = await this.actor();
    const record = await this.repository.find(id);
    if (!record) throw AppError.notFound("Enquiry was not found.");
    await this.authorizeRecord(record);
    if (record.lifecycleStatus === "suspended") {
      throw AppError.conflict("Restore the enquiry before synchronizing it with Frappe.");
    }
    return this.externalLifecycle.resync(id, actor.id);
  }

  async forceDelete(id: number) {
    await this.context.authorize("crm.enquiry.force-delete");
    const actor = await this.actor();
    if (actor.role !== "admin") {
      throw AppError.forbidden("Only tenant administrators can permanently delete enquiries.");
    }
    const current = await this.repository.find(id);
    if (!current) throw AppError.notFound("Enquiry was not found.");
    await this.externalLifecycle.delete(id, actor.id);
    const record = (await this.repository.forceDelete(id))!;
    await this.audit("force-deleted", record);
    return this.enrichOne(record);
  }

  async addMessage(id: number, input: CrmEnquiryMessageCreatePayload) {
    const { actor } = await this.childContext(id);
    await this.repository.addMessage(
      id,
      { comment: input.comment.trim(), messageType: input.messageType },
      actor.id
    );
    await this.repository.addActivity(
      id,
      input.messageType === "reply" ? "reply-added" : "comment-added",
      input.comment.trim(),
      actor.id,
      this.uuid()
    );
    await this.externalLifecycle.upsert(id, actor.id);
    return this.enrichOne((await this.repository.find(id))!);
  }

  async updateMessage(id: number, messageId: number, input: CrmEnquiryMessageUpdatePayload) {
    const { actor, record } = await this.childContext(id);
    const message = this.mutableMessage(record, messageId, actor.id);
    const comment = input.comment.trim();
    const updated = await this.repository.updateLatestMessage(id, messageId, actor.id, comment);
    if (!updated) {
      throw AppError.conflict("Only your latest conversation entry can be edited.");
    }
    await this.repository.addActivity(
      id,
      message.messageType === "reply" ? "reply-edited" : "comment-edited",
      comment,
      actor.id,
      this.uuid()
    );
    await this.externalLifecycle.upsert(id, actor.id);
    return this.enrichOne((await this.repository.find(id))!);
  }

  async deleteMessage(id: number, messageId: number) {
    const { actor, record } = await this.childContext(id);
    const message = this.mutableMessage(record, messageId, actor.id);
    const deleted = await this.repository.deleteLatestMessage(id, messageId, actor.id);
    if (!deleted) {
      throw AppError.conflict("Only your latest conversation entry can be deleted.");
    }
    await this.repository.addActivity(
      id,
      message.messageType === "reply" ? "reply-deleted" : "comment-deleted",
      message.comment,
      actor.id,
      this.uuid()
    );
    await this.externalLifecycle.upsert(id, actor.id);
    return this.enrichOne((await this.repository.find(id))!);
  }

  async addEmail(id: number, input: CrmEnquiryEmailCreatePayload) {
    const { actor } = await this.childContext(id);
    await this.repository.addEmail(
      id,
      {
        body: input.body.trim(),
        recipient: input.recipient.trim().toLowerCase(),
        subject: input.subject.trim()
      },
      actor.id,
      this.uuid()
    );
    await this.repository.addActivity(
      id,
      "email-added",
      input.subject.trim(),
      actor.id,
      this.uuid()
    );
    return this.enrichOne((await this.repository.find(id))!);
  }

  async addCall(id: number, input: CrmEnquiryCallCreatePayload) {
    const { actor } = await this.childContext(id);
    await this.repository.addCall(
      id,
      { calledAt: input.calledAt, phone: input.phone.trim(), summary: input.summary.trim() },
      actor.id,
      this.uuid()
    );
    await this.repository.addActivity(
      id,
      "call-added",
      input.summary.trim(),
      actor.id,
      this.uuid()
    );
    return this.enrichOne((await this.repository.find(id))!);
  }

  async addTask(id: number, input: CrmEnquiryTaskCreatePayload) {
    const { actor } = await this.childContext(id);
    await this.repository.addTask(
      id,
      { dueOn: input.dueOn, status: input.status, title: input.title.trim() },
      actor.id,
      this.uuid()
    );
    await this.repository.addActivity(id, "task-added", input.title.trim(), actor.id, this.uuid());
    return this.enrichOne((await this.repository.find(id))!);
  }

  async addNote(id: number, input: CrmEnquiryNoteCreatePayload) {
    const { actor } = await this.childContext(id);
    await this.repository.addNote(id, { note: input.note.trim() }, actor.id, this.uuid());
    await this.repository.addActivity(id, "note-added", input.note.trim(), actor.id, this.uuid());
    return this.enrichOne((await this.repository.find(id))!);
  }

  async addAttachment(id: number, input: CrmEnquiryAttachmentCreatePayload) {
    const { actor } = await this.childContext(id);
    await this.repository.addAttachment(
      id,
      { fileName: input.fileName.trim(), fileUrl: input.fileUrl.trim() },
      actor.id,
      this.uuid()
    );
    await this.repository.addActivity(
      id,
      "attachment-added",
      input.fileName.trim(),
      actor.id,
      this.uuid()
    );
    return this.enrichOne((await this.repository.find(id))!);
  }

  async userReferences() {
    await this.requireAnyView();
    return this.users.list();
  }

  async enquiryReferences() {
    await this.requireAnyView();
    return this.repository.listReferences();
  }

  private async actor() {
    const actor = await this.context.actorUser();
    if (!actor) throw AppError.unauthorized("Active tenant user is required.");
    return actor;
  }

  private async childContext(id: number) {
    await this.context.authorize("crm.enquiry.update");
    const actor = await this.actor();
    const record = await this.repository.find(id);
    if (!record) throw AppError.notFound("Enquiry was not found.");
    await this.authorizeRecord(record);
    if (record.lifecycleStatus === "suspended") {
      throw AppError.conflict("Restore the enquiry before adding workspace records.");
    }
    return { actor, record };
  }

  private mutableMessage(
    record: Awaited<ReturnType<CrmRepository["find"]>> extends infer T ? Exclude<T, null> : never,
    messageId: number,
    actorId: number
  ) {
    const message = record.messages.find((item) => item.id === messageId);
    if (!message) throw AppError.notFound("Conversation entry was not found.");
    if (message.createdByUserId !== actorId) {
      throw AppError.forbidden("Only the conversation entry creator can change it.");
    }
    if (record.messages.at(-1)?.id !== messageId) {
      throw AppError.conflict(
        "This conversation entry is locked because a newer comment or reply exists."
      );
    }
    return message;
  }

  private uuid() {
    return randomBytes(4).toString("hex");
  }

  private async authorizeRecord(record: {
    assignedToUserId: number | null;
    createdByUserId: number;
    lifecycleStatus: string;
    status: string;
  }) {
    const actor = await this.actor();
    const allowed =
      (record.assignedToUserId === actor.id &&
        (await this.context.can(viewPermissions.assigned))) ||
      (record.createdByUserId === actor.id && (await this.context.can(viewPermissions.created))) ||
      (record.lifecycleStatus === "active" &&
        record.assignedToUserId === null &&
        !["won", "lost"].includes(record.status) &&
        (await this.context.can(viewPermissions.open)));
    if (!allowed) throw AppError.forbidden("You do not have access to this enquiry.");
  }

  private async requireAnyView() {
    if (
      !(await this.context.can(viewPermissions.assigned)) &&
      !(await this.context.can(viewPermissions.created)) &&
      !(await this.context.can(viewPermissions.open))
    ) {
      throw AppError.forbidden("CRM enquiry access is required.");
    }
  }

  private async normalize(input: CrmEnquirySavePayload): Promise<CrmEnquirySavePayload> {
    const assigned =
      input.assignedToUserId === null ? null : await this.users.find(input.assignedToUserId);
    if (input.assignedToUserId !== null && !assigned) {
      throw AppError.validation("Assigned user must be an active tenant user.");
    }
    const scheduleDates = input.schedules.map((schedule) => schedule.scheduledOn);
    if (new Set(scheduleDates).size !== scheduleDates.length) {
      throw AppError.conflict("An enquiry cannot contain duplicate schedule dates.");
    }
    return {
      assignedToUserId: assigned?.id ?? null,
      customer: input.customer.trim(),
      enquiryDate: input.enquiryDate,
      enquiryGroup: input.enquiryGroup.trim(),
      messages: input.messages
        .map(({ comment }) => ({ comment: comment.trim() }))
        .filter(({ comment }) => Boolean(comment)),
      mobile: input.mobile.trim(),
      priority: input.priority,
      schedules: [...input.schedules].sort((left, right) =>
        left.scheduledOn.localeCompare(right.scheduledOn)
      ),
      status: input.status,
      subject: input.subject.trim(),
      title: input.title.trim(),
      workspace: input.workspace.trim()
    };
  }

  private async enrich(records: Awaited<ReturnType<CrmRepository["list"]>>) {
    return Promise.all(records.map((record) => this.enrichOne(record)));
  }

  private async enrichOne(
    record: Awaited<ReturnType<CrmRepository["find"]>> extends infer T ? Exclude<T, null> : never
  ): Promise<CrmEnquiry> {
    const [actor, assignedTo, createdBy] = await Promise.all([
      this.actor(),
      record.assignedToUserId === null
        ? Promise.resolve(null)
        : this.users.find(record.assignedToUserId),
      this.users.find(record.createdByUserId)
    ]);
    if ((record.assignedToUserId !== null && !assignedTo) || !createdBy) {
      throw AppError.conflict("An enquiry references a tenant user that is not active.");
    }
    return {
      ...record,
      assignedTo,
      createdBy: createdBy satisfies CrmUserReference,
      messages: record.messages.map((message, index) => {
        const mutable =
          record.lifecycleStatus === "active" &&
          message.createdByUserId === actor.id &&
          index === record.messages.length - 1;
        return { ...message, canDelete: mutable, canEdit: mutable };
      })
    };
  }

  private async audit(action: string, record: { id: number; title: string; uuid: string }) {
    await recordTenantAccessAudit({
      action,
      actorEmail: this.context.actorEmail,
      moduleKey: "crm.enquiry",
      recordId: record.id,
      recordLabel: record.title,
      recordUuid: record.uuid,
      tenantId: this.context.tenantId
    });
  }
}

export function crmEnquirySyncContract(database: CrmContext["database"]) {
  const repository = new CrmRepository(database);
  return {
    find: (id: number) => repository.find(id),
    list: () => repository.listAll(),
    async upsert(id: number | null, input: CrmEnquirySyncInput) {
      const value: CrmEnquirySavePayload = {
        assignedToUserId: input.assignedToUserId,
        customer: input.customer.trim(),
        enquiryDate: input.enquiryDate,
        enquiryGroup: input.enquiryGroup.trim(),
        messages: input.messages
          .map(({ comment }) => ({ comment: comment.trim() }))
          .filter(({ comment }) => Boolean(comment)),
        mobile: input.mobile.trim(),
        priority: input.priority,
        schedules: input.schedules,
        status: input.status,
        subject: input.subject.trim(),
        title: input.title.trim(),
        workspace: input.workspace.trim()
      };
      if (id) {
        const current = await repository.find(id);
        if (current?.lifecycleStatus === "suspended") {
          throw AppError.conflict("Suspended enquiries cannot be synchronized.");
        }
        return repository.update(id, value, true);
      }
      return repository.create(value, input.createdByUserId, randomBytes(4).toString("hex"));
    }
  };
}
