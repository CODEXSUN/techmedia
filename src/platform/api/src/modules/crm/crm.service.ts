import { AppError } from "@codexsun/framework/errors";
import type { PlatformModuleDependencies } from "../../module-dependencies.js";
import { recordAuditEvent } from "../../database/audit.js";
import type {
  CrmContext,
  CrmCustomerReference,
  CrmEnquiry,
  CrmEnquiryListFilters,
  CrmEnquiryMessageCreatePayload,
  CrmEnquiryOverview,
  CrmReport,
  CrmReportName,
  CrmEnquirySavePayload,
  CrmEnquiryStatusFilter,
  CrmEnquiryView,
  CrmJobSavePayload,
  CrmUserReference
} from "./crm.types.js";

type LiveGateway = ReturnType<PlatformModuleDependencies["frappeLiveEnquiryGateway"]>;
type LiveRecord = Awaited<ReturnType<LiveGateway["get"]>>;

const viewPermissions: Record<CrmEnquiryView, string> = {
  assigned: "crm.enquiry.assigned.view",
  created: "crm.enquiry.created.view",
  open: "crm.enquiry.open.view"
};

const suspendedMessagePrefix = "<s>";
const suspendedMessageSuffix = "</s>";

function isSuspendedMessage(comment: string) {
  const normalized = comment.trim();
  return (
    normalized.startsWith(suspendedMessagePrefix) && normalized.endsWith(suspendedMessageSuffix)
  );
}

function suspendMessage(comment: string) {
  return `${suspendedMessagePrefix}${comment}${suspendedMessageSuffix}`;
}

export class CrmService {
  constructor(
    private readonly context: CrmContext,
    private readonly gateway: LiveGateway
  ) {}

  async list(filters: CrmEnquiryListFilters) {
    await this.context.authorize(viewPermissions[filters.view]);
    const records = await this.gateway.list({
      employee: this.employee(),
      view: filters.view
    });
    const filtered = records
      .filter((record) => matchesStatus(record.status, filters.status))
      .filter((record) => !filters.enquiryId || record.name === filters.enquiryId)
      .filter((record) => matchesEnquirySearch(record, filters.search));
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
    const listPersonal = async (view: "assigned" | "created"): Promise<LiveRecord[]> =>
      (await this.context.can(viewPermissions[view])) ? this.gateway.list({ employee, view }) : [];
    const [assigned, created] = await Promise.all([
      listPersonal("assigned"),
      listPersonal("created")
    ]);
    const personal = uniqueByName([...assigned, ...created]);
    return {
      stats: {
        closedByMe: personal.filter((record) => isClosed(record.status)).length,
        createdByMe: created.length,
        inProgress: personal.filter((record) => isInProgress(record.status)).length,
        myEnquiries: assigned.length
      }
    };
  }

  async report(name: CrmReportName, filters: Record<string, string | null>): Promise<CrmReport> {
    await this.context.authorize("crm.report.view");
    return this.gateway.queryReport({
      filters,
      reportName:
        name === "list-in-status"
          ? "Enquiry List-In wise Status"
          : "Enquiry Owner wise Status"
    });
  }

  async create(input: CrmEnquirySavePayload) {
    await this.context.authorize("crm.enquiry.create");
    await this.validateAssignment(input.assignedToUserId);
    await this.validateCustomer(input.customer);
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
    await this.validateCustomer(input.customer, current.customer);
    const record = await this.gateway.update(name, toLivePayload(input));
    await this.audit("updated", record);
    return { ...(await this.map(record)), jobs: await this.gateway.jobs(name) };
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
    const messages: Array<{
      comment: string;
      mode?: "comment" | "reply";
      name?: string;
      parentMessage?: string | null;
    }> =
      current.messages.map(({ comment, name: childName, parentMessage }) => ({
        comment,
        ...(parentMessage ? { mode: "reply" as const } : { mode: "comment" as const }),
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
    messages.push({ comment, mode: input.messageType, parentMessage });
    return this.map(await this.gateway.updateMessages(name, messages, current.status));
  }

  async suspendMessage(name: string, messageId: string) {
    await this.context.authorize("crm.enquiry.update");
    const current = await this.gateway.get(name);
    await this.authorizeRecord(current);
    const index = current.messages.findIndex((message) => message.name === messageId);
    if (index < 0) throw AppError.notFound("Conversation entry was not found in Frappe.");
    if (index !== current.messages.length - 1) {
      throw AppError.conflict("Only the latest conversation entry can be suspended.");
    }
    if (isSuspendedMessage(current.messages[index]!.comment)) {
      throw AppError.conflict("This conversation entry is already suspended.");
    }
    const messages = current.messages.map(
      ({ comment, name: childName, parentMessage }, messageIndex) => ({
        comment: messageIndex === index ? suspendMessage(comment) : comment,
        ...(parentMessage ? { mode: "reply" as const } : { mode: "comment" as const }),
        name: childName,
        parentMessage
      })
    );
    return this.map(await this.gateway.updateMessages(name, messages, current.status));
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

  async createJob(name: string, input: CrmJobSavePayload) {
    await this.context.authorize("crm.job.manage");
    const current = await this.gateway.get(name);
    await this.authorizeRecord(current);
    await this.validateJob(input);
    const jobs = await this.gateway.jobs(name);
    if (input.status === "Running" && jobs.some((job) => job.status === "Running")) {
      throw AppError.conflict("A job is already running for this enquiry.");
    }
    await this.gateway.createJob(name, input);
    return this.get(name);
  }

  async updateJob(name: string, jobName: string, input: CrmJobSavePayload) {
    await this.context.authorize("crm.job.manage");
    const current = await this.gateway.get(name);
    await this.authorizeRecord(current);
    await this.validateJob(input);
    const jobs = await this.gateway.jobs(name);
    if (!jobs.some((job) => job.name === jobName)) {
      throw AppError.notFound("Job was not found against this enquiry in Frappe.");
    }
    if (
      input.status === "Running" &&
      jobs.some((job) => job.name !== jobName && job.status === "Running")
    ) {
      throw AppError.conflict("A different job is already running for this enquiry.");
    }
    await this.gateway.updateJob(name, jobName, input);
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

  async customerReferences(search?: string): Promise<CrmCustomerReference[]> {
    await this.requireAnyView();
    return this.gateway.customers(search);
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
        canSuspend:
          index === record.messages.length - 1 &&
          !record.messages.some((candidate) => candidate.parentMessage === message.name) &&
          !isSuspendedMessage(message.comment),
        comment: message.comment,
        createdAt: message.createdAt ?? record.modifiedAt,
        createdByUserId: message.createdBy,
        id: message.name,
        isSuspended: isSuspendedMessage(message.comment),
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
      title: record.title || displayTitle(record),
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

  private async validateCustomer(value: string, currentValue = "") {
    const customer = value.trim();
    if (!customer) return;
    if (customer === currentValue.trim()) return;
    const matches = await this.gateway.customers(customer);
    if (!matches.some((match) => match.id === customer)) {
      throw AppError.validation("Select an existing Frappe customer from the customer lookup.");
    }
  }

  private async validateJob(input: CrmJobSavePayload) {
    const employees = await this.gateway.employees();
    if (!employees.some((employee) => employee.name === input.employee)) {
      throw AppError.validation("Job employee must be an active Frappe Employee.");
    }
    if (input.status !== "Running" && !input.stopTime) {
      throw AppError.validation("Stop time is required for a completed or cancelled job.");
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

  private async audit(action: string, record: LiveRecord) {
    await recordAuditEvent({
      action,
      actorEmail: this.context.actorEmail,
      moduleKey: "crm.enquiry.live",
      recordId: numericId(record.name),
      recordLabel: displayTitle(record),
      recordUuid: record.name
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
      .map(({ comment, mode }) => ({ comment: comment.trim(), ...(mode ? { mode } : {}) }))
      .filter(({ comment }) => plainText(comment)),
    mobile: input.mobile.trim(),
    priority: input.priority,
    status: input.status,
    title: input.title.trim() || titleFromWorkspace(input.workspace)
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

function titleFromWorkspace(value: string) {
  return plainText(value).split(/\s+/u).slice(0, 8).join(" ") || "Enquiry";
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

/**
 * Search stays within the live, permission-scoped enquiry list. Frappe's resource
 * filters are AND-only for this query, so applying it here gives one consistent
 * match across all enquiry columns rather than restricting search to the document ID.
 */
function matchesEnquirySearch(record: LiveRecord, search?: string) {
  const terms = (search ?? "")
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/u)
    .map((term) => term.replace(/^#+/u, ""))
    .filter(Boolean);
  if (!terms.length) return true;
  const searchable = [
    record.name,
    String(numericId(record.name)),
    record.enquiryMessage,
    record.mobile,
    record.customer
  ]
    .map((value) => plainText(value).toLocaleLowerCase())
    .join(" ");
  return terms.every((term) => searchable.includes(term));
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
  if (normalized === "new") return "new";
  if (normalized === "won") return "won";
  if (normalized === "lost") return "lost";
  if (normalized === "re-open" || normalized === "reopen") return "reopen";
  if (normalized === "follow") return "follow";
  if (normalized === "hold for approval") return "hold-for-approval";
  if (normalized === "hold for spares") return "hold-for-spares";
  if (normalized === "hold for job-out") return "hold-for-job-out";
  if (normalized === "long hold") return "long-hold";
  if (normalized === "escalation") return "escalation";
  return "open";
}

function isClosed(status: string) {
  return ["won", "lost"].includes(status.trim().toLowerCase());
}

function isInProgress(status: string) {
  return [
    "follow",
    "hold for approval",
    "hold for spares",
    "hold for job-out",
    "long hold",
    "escalation"
  ].includes(status.trim().toLowerCase());
}

function matchesStatus(status: string, filter?: CrmEnquiryStatusFilter) {
  if (!filter || filter === "active") return !isClosed(status);
  if (filter === "closed") return isClosed(status);
  if (filter === "in-progress") return isInProgress(status);
  return status.trim().toLowerCase() === filter;
}

function uniqueByName(records: LiveRecord[]) {
  return [...new Map(records.map((record) => [record.name, record])).values()];
}
