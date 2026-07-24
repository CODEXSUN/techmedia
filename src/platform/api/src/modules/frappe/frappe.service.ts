import { createHash, randomBytes } from "node:crypto";
import { AppError } from "@codexsun/framework/errors";
import { recordTenantAccessAudit } from "../../database/tenant-access-audit.js";
import {
  decryptIntegrationCredential,
  encryptIntegrationCredential
} from "../../security/integration-credential.js";
import { crmEnquirySyncContract } from "../crm/index.js";
import {
  tenantUserFrappeCredentialContract,
  tenantUserFrappeImportContract,
  tenantUserReferenceContract
} from "../tenant-user/index.js";
import { tenantUserRoleStandardAccessContract } from "../tenant-user-role/index.js";
import { FrappeRepository, type StoredFrappeConnection } from "./frappe.repository.js";
import type {
  FrappeConnectionCredentials,
  FrappeConnectionSavePayload,
  FrappeConnectionSettings,
  FrappeConnectionVerificationPayload,
  FrappeConnectionVerificationResult,
  FrappeContext,
  FrappeEnquiryLifecycleFactory,
  FrappeEnquiryLifecycleResult,
  FrappeSyncResult,
  FrappeSyncSettingsSavePayload,
  FrappeUserImportResult,
  FrappeUserPreview,
  FrappeUserVerificationResult
} from "./frappe.types.js";

const handshakePath = "/api/method/frappe.auth.get_logged_user";
const maximumHandshakeResponseBytes = 64 * 1024;

export class FrappeService {
  private readonly repository: FrappeRepository;

  constructor(private readonly context: FrappeContext) {
    this.repository = new FrappeRepository(context.database);
  }

  async get() {
    await this.context.authorize("frappe.connection.view");
    const record = await this.repository.find();
    return record ? publicSettings(record) : null;
  }

  async save(input: FrappeConnectionSavePayload) {
    await this.context.authorize("frappe.connection.update");
    const current = await this.repository.find();
    const baseUrl = normalizeBaseUrl(input.baseUrl);
    const appCredentials = appCredentialsForSave(input, current);
    const resetVerification =
      !current || current.baseUrl !== baseUrl || appCredentials.credentialsChanged;
    const record = await this.repository.save({
      appKeyCiphertext: appCredentials.appKeyCiphertext,
      appSecretCiphertext: appCredentials.appSecretCiphertext,
      baseUrl,
      connectionName: input.connectionName.trim(),
      enabled: input.enabled,
      lastCheckedAt: resetVerification ? null : (current?.lastCheckedAt ?? null),
      lastVerifiedAt: resetVerification ? null : (current?.lastVerifiedAt ?? null),
      verificationStatus: resetVerification
        ? "unverified"
        : (current?.verificationStatus ?? "unverified"),
      uuid: current?.uuid ?? randomBytes(4).toString("hex")
    });
    if (resetVerification) {
      if (!current || current.baseUrl !== baseUrl) {
        await tenantUserFrappeCredentialContract(this.context.database).resetVerification();
      }
    }
    await recordTenantAccessAudit({
      action: current ? "updated" : "created",
      actorEmail: this.context.actorEmail,
      moduleKey: "frappe.connection",
      recordId: record.id,
      recordLabel: record.connectionName,
      recordUuid: record.uuid,
      tenantId: this.context.tenantId
    });
    return publicSettings(record);
  }

  async verify(
    input: FrappeConnectionVerificationPayload
  ): Promise<FrappeConnectionVerificationResult> {
    await this.context.authorize("frappe.connection.update");
    const current = await this.repository.find();
    const baseUrl = normalizeBaseUrl(input.baseUrl);
    const credentials = appCredentialsForVerification(input, current);

    let result: FrappeConnectionVerificationResult;
    try {
      result = await verifyFrappeHandshake({
        apiKey: credentials.appKey,
        apiSecret: credentials.appSecret,
        baseUrl
      });
    } catch (error) {
      const checkedAt = new Date();
      if (current && current.baseUrl === baseUrl) {
        await this.repository.recordVerification("offline", checkedAt);
      }
      await recordTenantAccessAudit({
        action: "verification_failed",
        actorEmail: this.context.actorEmail,
        moduleKey: "frappe.connection",
        recordId: current?.id ?? 0,
        recordLabel: current?.connectionName ?? baseUrl,
        recordUuid: current?.uuid ?? createHash("sha256").update(baseUrl).digest("hex").slice(0, 8),
        tenantId: this.context.tenantId
      });
      throw error;
    }
    if (current && current.baseUrl === baseUrl) {
      await this.repository.recordVerification("live", new Date(result.checkedAt));
    }
    await recordTenantAccessAudit({
      action: "verified",
      actorEmail: this.context.actorEmail,
      moduleKey: "frappe.connection",
      recordId: current?.id ?? 0,
      recordLabel: current?.connectionName ?? baseUrl,
      recordUuid: current?.uuid ?? createHash("sha256").update(baseUrl).digest("hex").slice(0, 8),
      tenantId: this.context.tenantId
    });
    return result;
  }

  async verifyUser(userId: number): Promise<FrappeUserVerificationResult> {
    await this.context.authorize("platform.application.user.update");
    const connection = await this.repository.find();
    if (!connection?.enabled) {
      throw AppError.conflict("Enable the Frappe connection before verifying user credentials.");
    }
    const verified = await verifyUserAgainstConnection(this.context.database, userId, connection);
    const credentials = await tenantUserFrappeCredentialContract(this.context.database).find(
      userId
    );
    if (!credentials) throw missingUserCredentials();
    const employeeCode = await requiredFrappeEmployeeName({
      apiKey: credentials.apiKey,
      apiSecret: credentials.apiSecret,
      authenticatedUser: verified.authenticatedUser,
      baseUrl: connection.baseUrl,
      connectionName: connection.connectionName,
      enabled: connection.enabled
    });
    await tenantUserFrappeCredentialContract(this.context.database).recordVerification(
      userId,
      "live",
      new Date(verified.checkedAt),
      verified.authenticatedUser,
      employeeCode
    );
    return { ...verified, employeeCode };
  }

  async getSyncSettings() {
    await this.context.authorize("frappe.connection.view");
    return this.repository.findSyncSettings();
  }

  async saveSyncSettings(input: FrappeSyncSettingsSavePayload) {
    await this.context.authorize("frappe.connection.update");
    const settings = await this.repository.saveSyncSettings(input);
    await recordTenantAccessAudit({
      action: "sync_settings_updated",
      actorEmail: this.context.actorEmail,
      moduleKey: "frappe.enquiry-sync",
      recordId: 0,
      recordLabel: "Enquiry sync",
      recordUuid: "f0sync01",
      tenantId: this.context.tenantId
    });
    return settings;
  }

  async sync(direction: "pull" | "push"): Promise<FrappeSyncResult> {
    await this.context.authorize("frappe.connection.update");
    const actor = await this.actor();
    const [connection, settings] = await Promise.all([
      frappeConnectionContract({ database: this.context.database, userId: actor.id }).get(),
      this.repository.findSyncSettings()
    ]);
    if (!connection?.enabled) {
      throw AppError.conflict("Enable the Frappe connection before running sync.");
    }
    if (!settings) throw AppError.conflict("Frappe enquiry sync settings are unavailable.");
    if (direction === "pull" && !settings.pullEnquiriesEnabled) {
      throw AppError.conflict("Enable pull from Frappe before running this sync.");
    }
    if (direction === "push" && !settings.pushEnquiriesEnabled) {
      throw AppError.conflict("Enable push to Frappe before running this sync.");
    }

    const result =
      direction === "pull"
        ? await this.pullEnquiries(connection, settings.enquiryDoctype)
        : await this.pushEnquiries(connection, settings.enquiryDoctype);
    await this.repository.recordSync(direction);
    await recordTenantAccessAudit({
      action: `${direction}_completed`,
      actorEmail: this.context.actorEmail,
      moduleKey: "frappe.enquiry-sync",
      recordId: 0,
      recordLabel: `${direction} enquiry sync`,
      recordUuid: "f0sync01",
      tenantId: this.context.tenantId
    });
    return result;
  }

  async previewUsers(): Promise<FrappeUserPreview[]> {
    await this.context.authorize("frappe.connection.view");
    await this.context.authorize("platform.application.user.view");
    const connection = await this.connectionForActor();
    const fields = JSON.stringify([
      "name",
      "full_name",
      "email",
      "username",
      "enabled",
      "user_type",
      "last_active"
    ]);
    const filters = JSON.stringify([
      ["enabled", "=", 1],
      ["user_type", "=", "System User"]
    ]);
    const response = await frappeRequest<{ data?: FrappeUserDocument[] }>(
      connection,
      `/api/resource/User?fields=${encodeURIComponent(fields)}&filters=${encodeURIComponent(filters)}&limit_page_length=500&order_by=full_name%20asc`
    );
    const localUsers = await tenantUserFrappeImportContract({
      actorEmail: this.context.actorEmail,
      database: this.context.database,
      tenantId: this.context.tenantId
    }).listExisting();
    const localByEmail = new Map(localUsers.map((user) => [user.email.toLowerCase(), user]));

    return (response.data ?? [])
      .filter((user) => !["Administrator", "Guest"].includes(user.name))
      .map((user) => toFrappeUserPreview(user, localByEmail))
      .filter((user): user is FrappeUserPreview => Boolean(user))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async importUser(frappeUserId: string): Promise<FrappeUserImportResult> {
    await this.context.authorize("frappe.connection.update");
    await this.context.authorize("platform.application.user.create");
    const connection = await this.connectionForActor();
    const response = await frappeRequest<{ data?: FrappeUserDocument }>(
      connection,
      `/api/resource/User/${encodeURIComponent(frappeUserId.trim())}`
    );
    const remote = response.data;
    if (!remote || !remote.enabled || remote.user_type !== "System User") {
      throw AppError.validation("Only enabled Frappe System Users can be added.");
    }
    const email = frappeUserEmail(remote);
    if (!email) throw AppError.validation("Frappe user must have a valid email address.");
    const result = await tenantUserFrappeImportContract({
      actorEmail: this.context.actorEmail,
      database: this.context.database,
      tenantId: this.context.tenantId
    }).importUser({
      email,
      name: remote.full_name?.trim() || remote.username?.trim() || email
    });
    await tenantUserRoleStandardAccessContract({
      actorEmail: this.context.actorEmail,
      database: this.context.database,
      tenantId: this.context.tenantId
    }).ensureForUser(result.user.id);
    await recordTenantAccessAudit({
      action: result.created ? "user_imported" : "user_already_exists",
      actorEmail: this.context.actorEmail,
      moduleKey: "frappe.user-sync",
      recordId: result.user.id,
      recordLabel: remote.name,
      recordUuid: result.user.uuid,
      tenantId: this.context.tenantId
    });
    return result;
  }

  private async actor() {
    const actor = await this.context.actorUser();
    if (!actor) throw AppError.unauthorized("Active tenant user is required.");
    return actor;
  }

  private async connectionForActor() {
    const actor = await this.actor();
    const connection = await frappeConnectionContract({
      database: this.context.database,
      userId: actor.id
    }).get();
    if (!connection?.enabled) {
      throw AppError.conflict("Enable the Frappe connection before loading users.");
    }
    return connection;
  }

  private async pullEnquiries(
    connection: FrappeConnectionCredentials,
    doctype: string
  ): Promise<FrappeSyncResult> {
    const names = await frappeRequest<{ data?: Array<{ name?: string }> }>(
      connection,
      `/api/resource/${encodeURIComponent(doctype)}?fields=${encodeURIComponent('["name"]')}&limit_page_length=500&order_by=modified%20asc`
    );
    const users = await tenantUserReferenceContract(this.context.database).list();
    const fallback =
      users.find((user) => user.email.toLowerCase() === this.context.actorEmail.toLowerCase()) ??
      users[0];
    if (!fallback) throw AppError.conflict("An active tenant user is required for enquiry sync.");
    const crm = crmEnquirySyncContract(this.context.database);
    const employeeEmails = new Map<string, string>();
    let created = 0;
    let updated = 0;
    let failed = 0;
    for (const item of names.data ?? []) {
      if (!item.name) continue;
      try {
        const response = await frappeRequest<{ data?: FrappeEnquiryDocument }>(
          connection,
          `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(item.name)}`
        );
        const document = response.data;
        if (!document) throw new Error("Frappe returned an empty enquiry.");
        const employeeName = document.assigned_to_employee || document.user_employee || "";
        let employeeEmail = employeeEmails.get(employeeName);
        if (employeeName && employeeEmail === undefined) {
          const employee = await frappeRequest<{ data?: { user_id?: string } }>(
            connection,
            `/api/resource/Employee/${encodeURIComponent(employeeName)}`
          ).catch(() => ({ data: undefined }));
          employeeEmail = employee.data?.user_id ?? "";
          employeeEmails.set(employeeName, employeeEmail);
        }
        const assigned =
          users.find((user) => user.email.toLowerCase() === employeeEmail?.toLowerCase()) ??
          fallback;
        const link = await this.repository.findLinkByFrappeName(document.name);
        const current = link ? await crm.find(Number(link.crm_enquiry_id)) : null;
        const record = await crm.upsert(link ? Number(link.crm_enquiry_id) : null, {
          assignedToUserId: employeeEmail ? assigned.id : (current?.assignedToUserId ?? null),
          createdByUserId: current?.createdByUserId ?? fallback.id,
          customer: document.customer ?? "",
          enquiryDate: document.date ?? null,
          enquiryGroup: document.group ?? "",
          messages: (document.enquiry_messages ?? [])
            .filter(({ comment }) => Boolean(comment?.trim()))
            .map(({ comment }) => ({ comment: comment!.trim() })),
          mobile: document.mobile ?? "",
          priority: current?.priority ?? "normal",
          schedules: current?.schedules.map(({ scheduledOn }) => ({ scheduledOn })) ?? [],
          status: fromFrappeStatus(document.status),
          subject: document.enquiry_details ?? "",
          title: document.enquiry_details || document.name,
          workspace: document.status_details ?? ""
        });
        if (!record) throw new Error("CRM enquiry could not be saved.");
        await this.repository.saveLink({
          crmEnquiryId: record.id,
          frappeModifiedAt: document.modified ?? null,
          frappeName: document.name
        });
        if (link) updated++;
        else created++;
      } catch {
        failed++;
      }
    }
    return { created, direction: "pull", failed, processed: created + updated + failed, updated };
  }

  private async pushEnquiries(
    connection: FrappeConnectionCredentials,
    doctype: string
  ): Promise<FrappeSyncResult> {
    const userEmployeeName = await requiredFrappeEmployeeName(connection);
    const crm = crmEnquirySyncContract(this.context.database);
    const records = await crm.list();
    const users = await tenantUserReferenceContract(this.context.database).list();
    const employeeNames = new Map<string, string>();
    let created = 0;
    let updated = 0;
    let failed = 0;
    for (const record of records) {
      try {
        const assigned = users.find((user) => user.id === record.assignedToUserId);
        let employeeName = assigned ? employeeNames.get(assigned.email) : "";
        if (assigned && employeeName === undefined) {
          const filters = JSON.stringify([["user_id", "=", assigned.email]]);
          const employees = await frappeRequest<{ data?: Array<{ name?: string }> }>(
            connection,
            `/api/resource/Employee?fields=${encodeURIComponent('["name"]')}&filters=${encodeURIComponent(filters)}&limit_page_length=1`
          );
          employeeName = employees.data?.[0]?.name ?? "";
          employeeNames.set(assigned.email, employeeName);
        }
        const payload = frappeEnquiryPayload(record, userEmployeeName, employeeName ?? "");
        const link = await this.repository.findLinkByCrmId(record.id);
        const response = link
          ? await frappeRequest<{ data?: FrappeEnquiryDocument }>(
              connection,
              `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(link.frappe_name)}`,
              { body: JSON.stringify(payload), method: "PUT" }
            )
          : await frappeRequest<{ data?: FrappeEnquiryDocument }>(
              connection,
              `/api/resource/${encodeURIComponent(doctype)}`,
              { body: JSON.stringify(payload), method: "POST" }
            );
        if (!response.data?.name) throw new Error("Frappe did not return an enquiry name.");
        await this.repository.saveLink({
          crmEnquiryId: record.id,
          frappeModifiedAt: response.data.modified ?? null,
          frappeName: response.data.name
        });
        if (link) updated++;
        else created++;
      } catch {
        failed++;
      }
    }
    return { created, direction: "push", failed, processed: created + updated + failed, updated };
  }
}

type FrappeEnquiryDocument = {
  assigned_to_employee?: string;
  customer?: string;
  date?: string;
  enquiry_details?: string;
  enquiry_messages?: Array<{ comment?: string }>;
  group?: string;
  mobile?: string;
  modified?: string;
  name: string;
  status?: string;
  status_details?: string;
  user_employee?: string;
};

type FrappeUserDocument = {
  email?: string;
  enabled?: number | boolean;
  full_name?: string;
  last_active?: string | null;
  name: string;
  user_type?: string;
  username?: string;
};

export function frappeConnectionContract(context: {
  database: FrappeContext["database"];
  userId: number;
}) {
  const repository = new FrappeRepository(context.database);
  return {
    async get(): Promise<FrappeConnectionCredentials | null> {
      const [record, credentials] = await Promise.all([
        repository.find(),
        tenantUserFrappeCredentialContract(context.database).find(context.userId)
      ]);
      if (!record || !credentials) return null;
      return {
        apiKey: credentials.apiKey,
        apiSecret: credentials.apiSecret,
        authenticatedUser: credentials.authenticatedUser,
        baseUrl: record.baseUrl,
        connectionName: record.connectionName,
        enabled: record.enabled
      };
    }
  };
}

export const frappeEnquiryLifecycleContract: FrappeEnquiryLifecycleFactory = (context) => {
  const repository = new FrappeRepository(context.database);
  const crm = crmEnquirySyncContract(context.database);

  async function upsert(
    enquiryId: number,
    userId: number,
    required: boolean
  ): Promise<FrappeEnquiryLifecycleResult> {
    const target = await lifecycleTarget(context.database, repository, userId, required);
    if (!target) return { action: "skipped", frappeName: null };
    const record = await crm.find(enquiryId);
    if (!record) throw AppError.notFound("Enquiry was not found for Frappe synchronization.");
    if (record.lifecycleStatus === "suspended") {
      throw AppError.conflict("Suspended enquiries cannot be synchronized with Frappe.");
    }

    const assigned = record.assignedToUserId
      ? await tenantUserReferenceContract(context.database).find(record.assignedToUserId)
      : null;
    const employeeName = assigned
      ? await findFrappeEmployeeName(context.database, userId, target.connection, assigned.email)
      : "";
    const userEmployeeName = await requiredFrappeEmployeeName(
      target.connection,
      context.database,
      userId
    );
    const payload = frappeEnquiryPayload(record, userEmployeeName, employeeName);
    const link = await repository.findLinkByCrmId(enquiryId);
    const response = link
      ? await frappeLifecycleRequest<{ data?: FrappeEnquiryDocument }>(
          context.database,
          userId,
          target.connection,
          `/api/resource/${encodeURIComponent(target.doctype)}/${encodeURIComponent(link.frappe_name)}`,
          { body: JSON.stringify(payload), method: "PUT" }
        )
      : await frappeLifecycleRequest<{ data?: FrappeEnquiryDocument }>(
          context.database,
          userId,
          target.connection,
          `/api/resource/${encodeURIComponent(target.doctype)}`,
          { body: JSON.stringify(payload), method: "POST" }
        );
    const document = response.data;
    if (!document?.name) throw new Error("Frappe did not return an enquiry name.");
    await repository.saveLink({
      crmEnquiryId: enquiryId,
      frappeModifiedAt: document.modified ?? null,
      frappeName: document.name
    });
    await repository.recordSync("push");
    await recordFrappeEnquiryAudit(context, link ? "updated" : "created", record);
    return { action: link ? "updated" : "created", frappeName: document.name };
  }

  return {
    async upsert(enquiryId, userId): Promise<FrappeEnquiryLifecycleResult> {
      return upsert(enquiryId, userId, false);
    },

    async resync(enquiryId, userId) {
      const result = await upsert(enquiryId, userId, true);
      if (result.action === "skipped" || !result.frappeName) {
        throw AppError.conflict("The enquiry could not be synchronized with Frappe.");
      }
      if (result.action !== "created" && result.action !== "updated") {
        throw AppError.conflict("The enquiry could not be synchronized with Frappe.");
      }
      return { action: result.action, frappeName: result.frappeName };
    },

    async delete(enquiryId, userId): Promise<FrappeEnquiryLifecycleResult> {
      const link = await repository.findLinkByCrmId(enquiryId);
      if (!link) return { action: "skipped", frappeName: null };
      const target = await lifecycleTarget(context.database, repository, userId, true);
      if (!target) throw AppError.conflict("Enable push to Frappe before deleting this enquiry.");
      const record = await crm.find(enquiryId);
      if (!record) throw AppError.notFound("Enquiry was not found for Frappe deletion.");
      await frappeLifecycleRequest<{ message?: string }>(
        context.database,
        userId,
        target.connection,
        `/api/resource/${encodeURIComponent(target.doctype)}/${encodeURIComponent(link.frappe_name)}`,
        { method: "DELETE" },
        [404]
      );
      await repository.recordSync("push");
      await recordFrappeEnquiryAudit(context, "deleted", record);
      return { action: "deleted", frappeName: link.frappe_name };
    }
  };
};

async function lifecycleTarget(
  database: FrappeContext["database"],
  repository: FrappeRepository,
  userId: number,
  required: boolean
) {
  const [record, settings, credentials] = await Promise.all([
    repository.find(),
    repository.findSyncSettings(),
    tenantUserFrappeCredentialContract(database).find(userId)
  ]);
  if (!settings?.pushEnquiriesEnabled) {
    if (required)
      throw AppError.conflict("Enable push to Frappe before synchronizing this enquiry.");
    return null;
  }
  if (!record?.enabled)
    throw AppError.conflict("Enable the Frappe connection before saving enquiries.");
  if (!credentials) {
    throw AppError.conflict(
      "Configure this user's Frappe API key and secret before saving enquiries."
    );
  }
  if (credentials.verificationStatus !== "live") {
    throw AppError.conflict("Verify this user's Frappe connection before saving enquiries.");
  }
  return {
    connection: {
      apiKey: credentials.apiKey,
      apiSecret: credentials.apiSecret,
      authenticatedUser: credentials.authenticatedUser,
      baseUrl: record.baseUrl,
      connectionName: record.connectionName,
      enabled: record.enabled
    } satisfies FrappeConnectionCredentials,
    doctype: settings.enquiryDoctype
  };
}

async function findFrappeEmployeeName(
  database: FrappeContext["database"],
  userId: number,
  connection: FrappeConnectionCredentials,
  userEmail: string
) {
  const filters = JSON.stringify([["user_id", "=", userEmail]]);
  const employees = await frappeLifecycleRequest<{ data?: Array<{ name?: string }> }>(
    database,
    userId,
    connection,
    `/api/resource/Employee?fields=${encodeURIComponent('["name"]')}&filters=${encodeURIComponent(filters)}&limit_page_length=1`
  );
  return employees.data?.[0]?.name ?? "";
}

async function requiredFrappeEmployeeName(
  connection: FrappeConnectionCredentials,
  database?: FrappeContext["database"],
  userId?: number
) {
  const authenticatedUser = connection.authenticatedUser?.trim();
  if (!authenticatedUser) {
    throw AppError.conflict(
      "Verify this user's Frappe API credentials once before synchronizing enquiries."
    );
  }
  const filters = JSON.stringify([["user_id", "=", authenticatedUser]]);
  const path = `/api/resource/Employee?fields=${encodeURIComponent('["name"]')}&filters=${encodeURIComponent(filters)}&limit_page_length=1`;
  const employees =
    database && userId
      ? await frappeLifecycleRequest<{ data?: Array<{ name?: string }> }>(
          database,
          userId,
          connection,
          path
        )
      : await frappeRequest<{ data?: Array<{ name?: string }> }>(connection, path);
  const employeeName = employees.data?.[0]?.name?.trim();
  if (!employeeName) {
    throw AppError.validation(
      `Frappe user ${authenticatedUser} must be linked to an Employee before synchronizing enquiries.`
    );
  }
  return employeeName;
}

function frappeEnquiryPayload(
  record: {
    createdAt: string;
    customer: string;
    enquiryDate: string | null;
    enquiryGroup: string;
    messages: Array<{ comment: string }>;
    mobile: string;
    status: string;
    subject: string;
    title: string;
    workspace: string;
  },
  userEmployeeName: string,
  assignedEmployeeName: string
) {
  return {
    ...(assignedEmployeeName ? { assigned_to_employee: assignedEmployeeName } : {}),
    ...(record.customer ? { customer: record.customer } : {}),
    date: record.enquiryDate ?? record.createdAt.slice(0, 10),
    enquiry_details: record.subject.trim() || record.title,
    enquiry_messages: record.messages.map(({ comment }) => ({ comment })),
    group: record.enquiryGroup,
    mobile: record.mobile,
    status: toFrappeStatus(record.status),
    status_details: record.workspace,
    user_employee: userEmployeeName
  };
}

function recordFrappeEnquiryAudit(
  context: Parameters<FrappeEnquiryLifecycleFactory>[0],
  action: "created" | "deleted" | "updated",
  record: { id: number; title: string; uuid: string }
) {
  return recordTenantAccessAudit({
    action: `frappe_${action}`,
    actorEmail: context.actorEmail,
    moduleKey: "frappe.enquiry-sync",
    recordId: record.id,
    recordLabel: record.title,
    recordUuid: record.uuid,
    tenantId: context.tenantId
  });
}

export function frappeUserAuthenticationContract(database: FrappeContext["database"]) {
  return {
    async statusForLogin(userId: number) {
      const connection = await new FrappeRepository(database).find();
      if (!connection?.enabled) {
        return {
          authenticatedUser: null,
          employeeCode: null,
          status: connection ? ("disabled" as const) : ("not_configured" as const)
        };
      }
      const credentials = await tenantUserFrappeCredentialContract(database).find(userId);
      if (!credentials) {
        return { authenticatedUser: null, employeeCode: null, status: "not_configured" as const };
      }
      if (
        credentials.verificationStatus === "live" &&
        credentials.authenticatedUser?.trim() &&
        credentials.employeeCode?.trim()
      ) {
        return {
          authenticatedUser: credentials.authenticatedUser,
          employeeCode: credentials.employeeCode,
          status: "live" as const
        };
      }
      return { authenticatedUser: null, employeeCode: null, status: "offline" as const };
    }
  };
}

function publicSettings(record: StoredFrappeConnection): FrappeConnectionSettings {
  return {
    appKeyConfigured: Boolean(record.appKeyCiphertext),
    appSecretConfigured: Boolean(record.appSecretCiphertext),
    baseUrl: record.baseUrl,
    connectionName: record.connectionName,
    enabled: record.enabled,
    id: record.id,
    lastCheckedAt: record.lastCheckedAt,
    lastVerifiedAt: record.lastVerifiedAt,
    updatedAt: record.updatedAt,
    uuid: record.uuid,
    verificationStatus: record.verificationStatus
  };
}

function appCredentialsForSave(
  input: FrappeConnectionSavePayload,
  current: StoredFrappeConnection | null
) {
  const appKey = input.appKey?.trim();
  const appSecret = input.appSecret?.trim();
  if (Boolean(appKey) !== Boolean(appSecret)) {
    throw AppError.validation("Frappe app key and app secret must both be configured.");
  }
  return {
    appKeyCiphertext: appKey
      ? encryptIntegrationCredential(appKey, "frappe-app")
      : (current?.appKeyCiphertext ?? null),
    appSecretCiphertext: appSecret
      ? encryptIntegrationCredential(appSecret, "frappe-app")
      : (current?.appSecretCiphertext ?? null),
    credentialsChanged: Boolean(appKey && appSecret)
  };
}

function appCredentialsForVerification(
  input: FrappeConnectionVerificationPayload,
  current: StoredFrappeConnection | null
) {
  const appKey = input.appKey?.trim();
  const appSecret = input.appSecret?.trim();
  if (Boolean(appKey) !== Boolean(appSecret)) {
    throw AppError.validation("Frappe app key and app secret must both be provided for testing.");
  }
  if (appKey && appSecret) return { appKey, appSecret };
  if (!current?.appKeyCiphertext || !current.appSecretCiphertext) {
    throw AppError.validation(
      "Enter a Frappe app key and app secret, or save them before verifying."
    );
  }
  return {
    appKey: decryptIntegrationCredential(current.appKeyCiphertext, "frappe-app"),
    appSecret: decryptIntegrationCredential(current.appSecretCiphertext, "frappe-app")
  };
}

function normalizeBaseUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw AppError.validation("Frappe URL must be a valid HTTP or HTTPS URL.");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw AppError.validation("Frappe URL must use HTTP or HTTPS without embedded credentials.");
  }
  if (url.search || url.hash) {
    throw AppError.validation("Frappe URL must not contain query parameters or a fragment.");
  }
  return url.toString().replace(/\/$/u, "");
}

async function verifyFrappeHandshake(input: {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
}): Promise<FrappeConnectionVerificationResult> {
  const startedAt = Date.now();
  let response: Response;
  try {
    response = await fetch(`${input.baseUrl}${handshakePath}`, {
      headers: {
        Accept: "application/json",
        Authorization: `token ${input.apiKey}:${input.apiSecret}`
      },
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(8_000)
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
      throw new AppError({
        code: "FRAPPE_CONNECTION_TIMEOUT",
        message: "Frappe did not respond within 8 seconds.",
        statusCode: 504
      });
    }
    throw new AppError({
      code: "FRAPPE_CONNECTION_FAILED",
      message: "TechMedia could not reach the Frappe server.",
      statusCode: 502
    });
  }

  if (response.status === 401 || response.status === 403) {
    throw AppError.validation("Frappe rejected the API key or API secret.");
  }
  if (!response.ok) {
    throw new AppError({
      code: "FRAPPE_HANDSHAKE_FAILED",
      message: `Frappe handshake failed with HTTP ${response.status}.`,
      statusCode: 502
    });
  }

  const body = await readHandshakeBody(response);
  const authenticatedUser =
    typeof body.message === "string" && body.message.trim() ? body.message.trim() : "";
  if (!authenticatedUser) {
    throw new AppError({
      code: "FRAPPE_HANDSHAKE_INVALID",
      message: "The server response was not a valid authenticated Frappe handshake.",
      statusCode: 502
    });
  }
  return {
    authenticatedUser,
    baseUrl: input.baseUrl,
    checkedAt: new Date().toISOString(),
    connected: true,
    latencyMs: Date.now() - startedAt
  };
}

async function verifyUserAgainstConnection(
  database: FrappeContext["database"],
  userId: number,
  connection: StoredFrappeConnection
) {
  const credentialContract = tenantUserFrappeCredentialContract(database);
  const credentials = await credentialContract.find(userId);
  if (!credentials) throw missingUserCredentials();
  try {
    const result = await verifyFrappeHandshake({
      apiKey: credentials.apiKey,
      apiSecret: credentials.apiSecret,
      baseUrl: connection.baseUrl
    });
    await credentialContract.recordVerification(
      userId,
      "live",
      new Date(result.checkedAt),
      result.authenticatedUser
    );
    return result;
  } catch (error) {
    await credentialContract.recordVerification(userId, "offline", new Date(), null);
    throw error;
  }
}

function missingUserCredentials() {
  return AppError.validation(
    "This user must have a Frappe API key and API secret configured before connecting."
  );
}

async function readHandshakeBody(response: Response): Promise<{ message?: unknown }> {
  if (!response.body) {
    throw invalidHandshakeResponse();
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    bytes += part.value.byteLength;
    if (bytes > maximumHandshakeResponseBytes) {
      await reader.cancel();
      throw invalidHandshakeResponse();
    }
    chunks.push(part.value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as { message?: unknown };
  } catch {
    throw invalidHandshakeResponse();
  }
}

function invalidHandshakeResponse() {
  return new AppError({
    code: "FRAPPE_HANDSHAKE_INVALID",
    message: "The server returned an invalid Frappe handshake response.",
    statusCode: 502
  });
}

async function frappeLifecycleRequest<T>(
  database: FrappeContext["database"],
  userId: number,
  connection: FrappeConnectionCredentials,
  path: string,
  init: RequestInit = {},
  acceptedStatuses: number[] = []
) {
  try {
    return await frappeRequest<T>(connection, path, init, acceptedStatuses);
  } catch (error) {
    if (error instanceof AppError && error.code === "FRAPPE_AUTHENTICATION_FAILED") {
      await tenantUserFrappeCredentialContract(database).recordVerification(
        userId,
        "offline",
        new Date(),
        null
      );
    }
    throw error;
  }
}

export async function frappeRequest<T = unknown>(
  connection: FrappeConnectionCredentials,
  path: string,
  init: RequestInit = {},
  acceptedStatuses: number[] = []
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${connection.baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `token ${connection.apiKey}:${connection.apiSecret}`,
        "Content-Type": "application/json",
        ...init.headers
      },
      redirect: "error",
      signal: AbortSignal.timeout(15_000)
    });
  } catch {
    throw new AppError({
      code: "FRAPPE_SYNC_UNAVAILABLE",
      message: "TechMedia could not reach the live Frappe server.",
      statusCode: 502
    });
  }
  const responseBody = await readFrappeResponseBody(response);
  if (!response.ok && !acceptedStatuses.includes(response.status)) {
    const upstreamMessage = frappeErrorMessage(responseBody);
    if (response.status === 401 || response.status === 403) {
      throw new AppError({
        code: "FRAPPE_AUTHENTICATION_FAILED",
        message:
          "Frappe rejected this user's saved API key or secret. Update the credentials and verify them once.",
        statusCode: 422
      });
    }
    const validationStatus = [409, 417, 422].includes(response.status);
    if (response.status === 404) {
      throw AppError.notFound(upstreamMessage || "The requested Frappe record was not found.");
    }
    throw new AppError({
      code: validationStatus ? "FRAPPE_VALIDATION_FAILED" : "FRAPPE_REQUEST_FAILED",
      message: upstreamMessage
        ? `Frappe rejected the request: ${upstreamMessage}`
        : `Frappe request failed with HTTP ${response.status}.`,
      statusCode: validationStatus ? 422 : 502
    });
  }
  return responseBody as T;
}

async function readFrappeResponseBody(response: Response): Promise<unknown> {
  const text = (await response.text()).slice(0, 64_000);
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

function frappeErrorMessage(body: unknown) {
  if (!body || typeof body !== "object") return "";
  const value = body as Record<string, unknown>;
  const direct = safeFrappeMessage(value.message);
  if (direct) return direct;
  if (typeof value._server_messages !== "string") return "";
  try {
    const messages = JSON.parse(value._server_messages) as unknown;
    if (!Array.isArray(messages)) return "";
    for (const item of messages) {
      if (typeof item !== "string") continue;
      try {
        const parsed = JSON.parse(item) as { message?: unknown };
        const message = safeFrappeMessage(parsed.message);
        if (message) return message;
      } catch {
        const message = safeFrappeMessage(item);
        if (message) return message;
      }
    }
  } catch {
    return "";
  }
  return "";
}

function safeFrappeMessage(value: unknown) {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]*>/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 500);
}

function frappeUserEmail(user: FrappeUserDocument) {
  const candidate = (user.email || user.name).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(candidate) ? candidate : "";
}

function toFrappeUserPreview(
  user: FrappeUserDocument,
  localByEmail: Map<
    string,
    { email: string; id: number; status: "active" | "inactive" | "suspended" }
  >
): FrappeUserPreview | null {
  const email = frappeUserEmail(user);
  if (!email) return null;
  const local = localByEmail.get(email);
  return {
    email,
    enabled: Boolean(user.enabled),
    frappeUserId: user.name,
    lastActiveAt: user.last_active?.trim() || null,
    localStatus: local?.status ?? null,
    localUserId: local?.id ?? null,
    name: user.full_name?.trim() || user.username?.trim() || email,
    userType: user.user_type?.trim() || "System User"
  };
}

function fromFrappeStatus(value: string | undefined) {
  const status = value?.trim().toLowerCase();
  if (status === "follow" || status === "escalation" || status === "won" || status === "lost") {
    return status;
  }
  return "open" as const;
}

function toFrappeStatus(value: string) {
  return value[0]!.toUpperCase() + value.slice(1);
}
