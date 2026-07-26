import { randomBytes } from "node:crypto";
import { AppError } from "@codexsun/framework/errors";
import type { PlatformModuleDependencies } from "../../module-dependencies.js";
import { recordTenantAccessAudit } from "../../database/tenant-access-audit.js";
import type {
  CrmContext,
  CrmEnquiry,
  CrmEnquiryListFilters,
  CrmEnquiryMessageCreatePayload,
  CrmEnquiryMessageUpdatePayload,
  CrmEnquiryOverview,
  CrmEnquirySavePayload,
  CrmEnquirySyncInput,
  CrmEnquiryView,
  CrmUserReference
} from "./crm.types.js";
import { CrmRepository } from "./crm.repository.js";

type LiveGateway = ReturnType<PlatformModuleDependencies["frappeLiveEnquiryGateway"]>;
type LiveRecord = Awaited<ReturnType<LiveGateway["get"]>>;

const viewPermissions: Record<CrmEnquiryView, string> = {
  assigned: "crm.enquiry.assigned.view",
  created: "crm.enquiry.created.view",
  open: "crm.enquiry.open.view"
};

export class CrmService {
  constructor(
    private readonly context: CrmContext,
    private readonly gateway: LiveGateway
  ) {}

  async list(filters: CrmEnquiryListFilters) {
    await this.context.authorize(viewPermissions[filters.view]);
    const records = await this.gateway.list({
      employee: this.employee(),
      view: filters.view,
      ...(filters.search ? { search: filters.search } : {})
    });
    const filtered = filters.enquiryId
      ? records.filter((record) => record.name === filters.enquiryId)
      : records;
    return this.mapMany(filtered);
  }

  async get(name: string) {
    await this.requireAnyView();
    const record = await this.gateway.get(name);
    await this.authorizeRecord(record);
    return { ...(await this.map(record)), jobs: await this.gateway.jobs(name) };
  }

  async overview(): Promise<CrmEnquiryOverview> {
    await this.requireAnyView();
    const employee = this.employee();
    const views: CrmEnquiryView[] = ["assigned", "created", "open"];
    const visible = await Promise.all(
      views.map(async (view) =>
        (await this.context.can(viewPermissions[view]))
          ? this.gateway.list({ employee, view })
          : Promise.resolve([])
      )
    );
    const records = uniqueByName(visible.flat());
    const employees = await this.gateway.employees();
    const counts = new Map<string, { active: number; closed: number; total: number }>();
    for (const record of records) {
      const owner = record.assignedToEmployee || record.userEmployee;
      if (!owner) continue;
      const current = counts.get(owner) ?? { active: 0, closed: 0, total: 0 };
      current.total++;
      if (isClosed(record.status)) current.closed++;
      else current.active++;
      counts.set(owner, current);
    }
    const closed = records.filter((record) => isClosed(record.status)).length;
    const open = records.filter((record) => record.status.toLowerCase() === "open").length;
    return {
      leaderboard: employees
        .map((employee) => {
          const count = counts.get(employee.name) ?? { active: 0, closed: 0, total: 0 };
          return {
            ...count,
            completionRate: count.total === 0 ? 0 : Math.round((count.closed / count.total) * 100),
            user: employeeReference(employee)
          };
        })
        .filter((row) => row.total > 0)
        .sort((left, right) => right.total - left.total),
      stats: {
        closed,
        inProgress: records.length - closed - open,
        open,
        total: records.length
      }
    };
  }

  async create(input: CrmEnquirySavePayload) {
    await this.context.authorize("crm.enquiry.create");
    await this.validateAssignment(input.assignedToUserId);
    const record = await this.gateway.create(toLivePayload(input));
    await this.audit("created", record);
    return this.map(record);
  }

  async update(name: string, input: CrmEnquirySavePayload) {
    await this.context.authorize("crm.enquiry.update");
    const current = await this.gateway.get(name);
    await this.authorizeRecord(current);
    if (input.assignedToUserId !== current.assignedToEmployee) {
      await this.context.authorize("crm.enquiry.assign");
    }
    await this.validateAssignment(input.assignedToUserId);
    const record = await this.gateway.update(name, toLivePayload(input));
    await this.audit("updated", record);
    return this.map(record);
  }

  async forceDelete(name: string) {
    await this.context.authorize("crm.enquiry.force-delete");
    const current = await this.gateway.get(name);
    await this.gateway.delete(name);
    await this.audit("deleted", current);
    return this.map(current);
  }

  async addMessage(name: string, input: CrmEnquiryMessageCreatePayload) {
    await this.context.authorize("crm.enquiry.update");
    const current = await this.gateway.get(name);
    await this.authorizeRecord(current);
    const messages: Array<{ comment: string; name?: string; parentMessage?: string | null }> =
      current.messages.map(({ comment, name: childName, parentMessage }) => ({
        comment,
        name: childName,
        parentMessage
      }));
    const comment = input.comment.trim();
    if (!plainText(comment)) throw AppError.validation("Comment cannot be empty.");
    const parentMessage =
      input.messageType === "reply"
        ? input.parentMessageId ||
          [...current.messages].reverse().find((message) => !message.parentMessage)?.name ||
          null
        : null;
    if (input.messageType === "reply" && !parentMessage) {
      throw AppError.validation("Add a comment before adding a reply.");
    }
    messages.push({ comment, parentMessage });
    return this.map(await this.gateway.updateMessages(name, messages));
  }

  async updateMessage(name: string, messageId: string, input: CrmEnquiryMessageUpdatePayload) {
    await this.context.authorize("crm.enquiry.update");
    const current = await this.gateway.get(name);
    await this.authorizeRecord(current);
    const index = current.messages.findIndex((message) => message.name === messageId);
    if (index < 0) throw AppError.notFound("Conversation entry was not found in Frappe.");
    if (index !== current.messages.length - 1) {
      throw AppError.conflict("Only the latest conversation entry can be edited.");
    }
    const messages = current.messages.map(({ comment, name: childName, parentMessage }) => ({
      comment,
      name: childName,
      parentMessage
    }));
    const comment = input.comment.trim();
    if (!plainText(comment)) throw AppError.validation("Comment cannot be empty.");
    messages[index] = {
      comment,
      name: messages[index]!.name,
      parentMessage: messages[index]!.parentMessage
    };
    return this.map(await this.gateway.updateMessages(name, messages));
  }

  async deleteMessage(name: string, messageId: string) {
    await this.context.authorize("crm.enquiry.update");
    const current = await this.gateway.get(name);
    await this.authorizeRecord(current);
    const index = current.messages.findIndex((message) => message.name === messageId);
    if (index < 0) throw AppError.notFound("Conversation entry was not found in Frappe.");
    if (index !== current.messages.length - 1) {
      throw AppError.conflict("Only the latest conversation entry can be deleted.");
    }
    const messages = current.messages
      .filter((_, messageIndex) => messageIndex !== index)
      .map(({ comment, name: childName, parentMessage }) => ({
        comment,
        name: childName,
        parentMessage
      }));
    return this.map(await this.gateway.updateMessages(name, messages));
  }

  async startJob(name: string) {
    await this.context.authorize("crm.enquiry.update");
    const current = await this.gateway.get(name);
    await this.authorizeRecord(current);
    const jobs = await this.gateway.jobs(name);
    if (jobs.filter((job) => job.status === "Running").length > 0) {
      throw AppError.conflict("A job is already running for this enquiry.");
    }
    await this.gateway.startJob(name);
    return this.get(name);
  }

  async stopJob(name: string, jobName: string) {
    await this.context.authorize("crm.enquiry.update");
    const current = await this.gateway.get(name);
    await this.authorizeRecord(current);
    await this.gateway.stopJob(name, jobName);
    return this.get(name);
  }

  async userReferences() {
    await this.requireAnyView();
    return (await this.gateway.employees()).map(employeeReference);
  }

  async enquiryReferences() {
    await this.requireAnyView();
    const records = await this.gateway.list({ employee: this.employee(), view: "created" });
    return records.map((record) => ({ id: record.name, title: displayTitle(record) }));
  }

  private async mapMany(records: LiveRecord[]) {
    const employees = await this.gateway.employees();
    return Promise.all(records.map((record) => this.map(record, employees)));
  }

  private async map(
    record: LiveRecord,
    knownEmployees?: Awaited<ReturnType<LiveGateway["employees"]>>
  ) {
    const employees = knownEmployees ?? (await this.gateway.employees());
    const byName = new Map(employees.map((employee) => [employee.name, employee]));
    const assigned = record.assignedToEmployee
      ? (byName.get(record.assignedToEmployee) ?? {
          email: "",
          name: record.assignedToEmployee,
          title: record.assignedToEmployee
        })
      : null;
    const created = byName.get(record.userEmployee) ?? {
      email: "",
      name: record.userEmployee || "Frappe",
      title: record.userEmployee || "Frappe"
    };
    return {
      activities: record.activities.map((entry) => ({
        action: entry.action,
        createdAt: entry.createdAt,
        createdByUserId: numericId(entry.createdBy),
        details: entry.details,
        id: numericId(entry.name),
        uuid: entry.name
      })),
      assignedTo: assigned ? employeeReference(assigned) : null,
      assignedToUserId: assigned?.name ?? null,
      attachments: [],
      calls: [],
      createdAt: record.createdAt,
      createdBy: employeeReference(created),
      createdByUserId: created.name,
      customer: record.customer,
      enquiryDate: record.enquiryDate,
      enquiryGroup: record.enquiryGroup,
      emails: [],
      frappeName: record.name,
      id: numericId(record.name),
      jobs: [],
      lifecycleStatus: "active" as const,
      messages: record.messages.map((message, index) => ({
        canDelete:
          message.createdBy === this.context.actorEmail &&
          index === record.messages.length - 1 &&
          !record.messages.some((candidate) => candidate.parentMessage === message.name),
        canEdit:
          message.createdBy === this.context.actorEmail && index === record.messages.length - 1,
        comment: message.comment,
        createdAt: message.createdAt ?? record.modifiedAt,
        createdByUserId: message.createdBy,
        id: message.name,
        messageType: message.parentMessage ? ("reply" as const) : ("comment" as const),
        parentMessageId: message.parentMessage
      })),
      mobile: record.mobile,
      notes: [],
      priority: record.priority,
      schedules: record.enquiryDate
        ? [{ id: `${record.name}-due`, scheduledOn: record.enquiryDate }]
        : [],
      status: fromFrappeStatus(record.status),
      tasks: [],
      title: displayTitle(record),
      updatedAt: record.modifiedAt,
      uuid: record.name,
      workspace: record.enquiryMessage
    } satisfies CrmEnquiry;
  }

  private async authorizeRecord(record: LiveRecord) {
    const employee = this.employee();
    const allowed =
      (record.assignedToEmployee === employee &&
        (await this.context.can(viewPermissions.assigned))) ||
      (record.userEmployee === employee && (await this.context.can(viewPermissions.created))) ||
      (!record.assignedToEmployee &&
        !isClosed(record.status) &&
        (await this.context.can(viewPermissions.open)));
    if (!allowed) throw AppError.forbidden("You do not have access to this enquiry.");
  }

  private async validateAssignment(value: string | null) {
    if (!value) return;
    const employees = await this.gateway.employees();
    if (!employees.some((employee) => employee.name === value)) {
      throw AppError.validation("Assigned employee must be an active Frappe Employee.");
    }
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

  private employee() {
    const employee = this.context.frappeEmployeeCode?.trim();
    if (!employee) {
      throw AppError.conflict(
        "Sign in again after linking the Frappe user to an Employee. CRM uses that verified session mapping."
      );
    }
    return employee;
  }

  private async actor() {
    const actor = await this.context.actorUser();
    if (!actor) throw AppError.unauthorized("Active tenant user is required.");
    return actor;
  }

  private async audit(action: string, record: LiveRecord) {
    await recordTenantAccessAudit({
      action,
      actorEmail: this.context.actorEmail,
      moduleKey: "crm.enquiry.live",
      recordId: numericId(record.name),
      recordLabel: displayTitle(record),
      recordUuid: record.name.slice(-8).padStart(8, "0"),
      tenantId: this.context.tenantId
    });
  }
}

function toLivePayload(input: CrmEnquirySavePayload) {
  return {
    assignedToEmployee: input.assignedToUserId,
    customer: input.customer.trim(),
    enquiryDate: input.enquiryDate,
    enquiryGroup: input.enquiryGroup.trim(),
    enquiryMessage: input.workspace.trim() || input.title.trim(),
    messages: input.messages
      .map(({ comment }) => ({ comment: comment.trim() }))
      .filter(({ comment }) => plainText(comment)),
    mobile: input.mobile.trim(),
    priority: input.priority,
    status: input.status
  };
}

function employeeReference(employee: {
  email: string;
  name: string;
  title: string;
}): CrmUserReference {
  return {
    email: employee.email || `${employee.name}@frappe.local`,
    id: employee.name,
    name: employee.title,
    uuid: employee.name
  };
}

function displayTitle(record: Pick<LiveRecord, "enquiryMessage" | "name">) {
  return plainText(record.enquiryMessage) || record.name;
}

function plainText(value: string) {
  return value
    .replace(/<br\s*\/?\s*>/giu, " ")
    .replace(/<\/p\s*>/giu, " ")
    .replace(/<[^>]*>/gu, "")
    .replace(/&nbsp;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/&quot;/giu, '"')
    .replace(/&#39;|&apos;/giu, "'")
    .replace(/\s+/gu, " ")
    .trim();
}

function numericId(name: string) {
  const digits = name.match(/\d+/g)?.join("");
  if (digits) return Math.max(Number(digits) % 2_147_483_647, 1);
  let hash = 0;
  for (const character of name) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return Math.max(hash % 2_147_483_647, 1);
}

function fromFrappeStatus(value: string): CrmEnquiry["status"] {
  const normalized = value.trim().toLowerCase();
  if (normalized === "won") return "won";
  if (normalized === "lost") return "lost";
  if (normalized === "follow") return "follow";
  if (normalized === "escalation") return "escalation";
  return "open";
}

function isClosed(status: string) {
  return ["won", "lost"].includes(status.trim().toLowerCase());
}

function uniqueByName(records: LiveRecord[]) {
  return [...new Map(records.map((record) => [record.name, record])).values()];
}

/** @deprecated Read-only transition support for pre-cutover Frappe code. Not routed by CRM. */
export function crmEnquirySyncContract(database: CrmContext["database"]) {
  const repository = new CrmRepository(database);
  return {
    find: (id: number) => repository.find(id),
    list: () => repository.listAll(),
    async upsert(id: number | null, input: CrmEnquirySyncInput) {
      const value = {
        assignedToUserId: input.assignedToUserId,
        customer: input.customer.trim(),
        enquiryDate: input.enquiryDate,
        enquiryGroup: input.enquiryGroup.trim(),
        messages: input.messages,
        mobile: input.mobile.trim(),
        priority: input.priority,
        schedules: input.schedules,
        status: input.status,
        subject: "",
        title: input.title.trim(),
        workspace: input.workspace.trim()
      };
      return id
        ? repository.update(id, value as never, true)
        : repository.create(value as never, input.createdByUserId, randomBytes(4).toString("hex"));
    }
  };
}
