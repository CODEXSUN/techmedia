import { randomBytes } from "node:crypto";
import { AppError } from "@codexsun/framework/errors";
import { recordTenantAccessAudit } from "../../database/tenant-access-audit.js";
import { tenantUserReferenceContract } from "../tenant-user/index.js";
import { CrmRepository } from "./crm.repository.js";
import type {
  CrmContext,
  CrmEnquiry,
  CrmEnquiryListFilters,
  CrmEnquiryOverview,
  CrmEnquirySavePayload,
  CrmEnquirySyncInput,
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

  constructor(private readonly context: CrmContext) {
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

  async forceDelete(id: number) {
    await this.context.authorize("crm.enquiry.force-delete");
    const actor = await this.actor();
    if (actor.role !== "admin") {
      throw AppError.forbidden("Only tenant administrators can permanently delete enquiries.");
    }
    const current = await this.repository.find(id);
    if (!current) throw AppError.notFound("Enquiry was not found.");
    const record = (await this.repository.forceDelete(id))!;
    await this.audit("force-deleted", record);
    return this.enrichOne(record);
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
    const [assignedTo, createdBy] = await Promise.all([
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
      createdBy: createdBy satisfies CrmUserReference
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
        title: input.title.trim(),
        workspace: input.workspace.trim()
      };
      if (id) {
        const current = await repository.find(id);
        if (current?.lifecycleStatus === "suspended") {
          throw AppError.conflict("Suspended enquiries cannot be synchronized.");
        }
        return repository.update(id, value);
      }
      return repository.create(value, input.createdByUserId, randomBytes(4).toString("hex"));
    }
  };
}
