import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { AppError } from "@codexsun/framework/errors";
import { recordTenantAccessAudit } from "../../database/tenant-access-audit.js";
import { crmEnquirySyncContract } from "../crm/index.js";
import { tenantUserReferenceContract } from "../tenant-user/index.js";
import { env } from "../../env.js";
import { FrappeRepository, type StoredFrappeConnection } from "./frappe.repository.js";
import type {
  FrappeConnectionCredentials,
  FrappeConnectionSavePayload,
  FrappeConnectionSettings,
  FrappeConnectionVerificationPayload,
  FrappeConnectionVerificationResult,
  FrappeContext,
  FrappeSyncResult,
  FrappeSyncSettingsSavePayload
} from "./frappe.types.js";

const encryptionVersion = "v1";
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
    const apiKey = input.apiKey?.trim();
    const apiSecret = input.apiSecret?.trim();
    if (!current && (!apiKey || !apiSecret)) {
      throw AppError.validation("API key and API secret are required for the first connection.");
    }
    const baseUrl = normalizeBaseUrl(input.baseUrl);
    const resetVerification =
      !current || Boolean(apiKey || apiSecret) || current.baseUrl !== baseUrl;
    const record = await this.repository.save({
      apiKeyCiphertext: apiKey ? encryptCredential(apiKey) : current!.apiKeyCiphertext,
      apiSecretCiphertext: apiSecret ? encryptCredential(apiSecret) : current!.apiSecretCiphertext,
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
    const apiKey = input.apiKey?.trim() || decryptConfiguredCredential(current?.apiKeyCiphertext);
    const apiSecret =
      input.apiSecret?.trim() || decryptConfiguredCredential(current?.apiSecretCiphertext);
    if (!apiKey || !apiSecret) {
      throw AppError.validation(
        "API key and API secret are required to verify the Frappe connection."
      );
    }

    let result: FrappeConnectionVerificationResult;
    try {
      result = await verifyFrappeHandshake({ apiKey, apiSecret, baseUrl });
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
    const [connection, settings] = await Promise.all([
      frappeConnectionContract({ database: this.context.database }).get(),
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
        const payload = {
          ...(employeeName ? { assigned_to_employee: employeeName } : {}),
          ...(record.customer ? { customer: record.customer } : {}),
          enquiry_details: record.title,
          enquiry_messages: record.messages.map(({ comment }) => ({ comment })),
          group: record.enquiryGroup,
          mobile: record.mobile,
          status: toFrappeStatus(record.status),
          status_details: record.workspace
        };
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

export function frappeConnectionContract(context: { database: FrappeContext["database"] }) {
  const repository = new FrappeRepository(context.database);
  return {
    async get(): Promise<FrappeConnectionCredentials | null> {
      const record = await repository.find();
      if (!record) return null;
      return {
        apiKey: decryptCredential(record.apiKeyCiphertext),
        apiSecret: decryptCredential(record.apiSecretCiphertext),
        baseUrl: record.baseUrl,
        connectionName: record.connectionName,
        enabled: record.enabled
      };
    }
  };
}

function publicSettings(record: StoredFrappeConnection): FrappeConnectionSettings {
  return {
    apiKeyConfigured: Boolean(record.apiKeyCiphertext),
    apiSecretConfigured: Boolean(record.apiSecretCiphertext),
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

function credentialKey() {
  const operatorKey = env.TECHMEDIA_INTEGRATION_ENCRYPTION_KEY.trim() || env.JWT_SECRET;
  return createHash("sha256").update(`techmedia:frappe:${operatorKey}`).digest();
}

function encryptCredential(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", credentialKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [
    encryptionVersion,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url")
  ].join(".");
}

function decryptCredential(value: string) {
  const [version, iv, tag, ciphertext] = value.split(".");
  if (version !== encryptionVersion || !iv || !tag || !ciphertext) {
    throw AppError.conflict("Stored Frappe credentials use an unsupported encryption format.");
  }
  try {
    const decipher = createDecipheriv("aes-256-gcm", credentialKey(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64url")),
      decipher.final()
    ]).toString("utf8");
  } catch {
    throw AppError.conflict(
      "Stored Frappe credentials could not be decrypted with the configured integration key."
    );
  }
}

function decryptConfiguredCredential(value: string | undefined) {
  return value ? decryptCredential(value) : "";
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

async function frappeRequest<T>(
  connection: FrappeConnectionCredentials,
  path: string,
  init: RequestInit = {}
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
      message: "TechMedia could not reach Frappe during enquiry sync.",
      statusCode: 502
    });
  }
  if (!response.ok) {
    throw new AppError({
      code: "FRAPPE_SYNC_FAILED",
      message: `Frappe enquiry sync failed with HTTP ${response.status}.`,
      statusCode: 502
    });
  }
  return (await response.json()) as T;
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
