import { sql, type Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";
import type { FrappeSyncSettingsSavePayload } from "./frappe.types.js";

type FrappeConnectionRow = {
  api_key_ciphertext: string;
  api_secret_ciphertext: string;
  base_url: string;
  connection_name: string;
  enabled: boolean | number;
  id: number;
  last_checked_at: Date | string | null;
  last_verified_at: Date | string | null;
  updated_at: Date | string;
  uuid: string;
  verification_status: "live" | "offline" | "unverified";
};

export type StoredFrappeConnection = {
  apiKeyCiphertext: string;
  apiSecretCiphertext: string;
  baseUrl: string;
  connectionName: string;
  enabled: boolean;
  id: number;
  lastCheckedAt: string | null;
  lastVerifiedAt: string | null;
  updatedAt: string;
  uuid: string;
  verificationStatus: "live" | "offline" | "unverified";
};

export class FrappeRepository {
  constructor(private readonly database: Kysely<TenantDatabase>) {}

  async find() {
    const result = await sql<FrappeConnectionRow>`SELECT
      id,uuid,connection_name,base_url,api_key_ciphertext,api_secret_ciphertext,enabled,
      verification_status,last_checked_at,last_verified_at,updated_at
      FROM frappe_connection_settings WHERE connection_key='default' LIMIT 1`.execute(
      this.database
    );
    return result.rows[0] ? mapConnection(result.rows[0]) : null;
  }

  async save(input: {
    apiKeyCiphertext: string;
    apiSecretCiphertext: string;
    baseUrl: string;
    connectionName: string;
    enabled: boolean;
    lastCheckedAt: string | null;
    lastVerifiedAt: string | null;
    uuid: string;
    verificationStatus: "live" | "offline" | "unverified";
  }) {
    await sql`INSERT INTO frappe_connection_settings
      (uuid,connection_key,connection_name,base_url,api_key_ciphertext,api_secret_ciphertext,enabled,
        verification_status,last_checked_at,last_verified_at)
      VALUES (${input.uuid},'default',${input.connectionName},${input.baseUrl},
        ${input.apiKeyCiphertext},${input.apiSecretCiphertext},${input.enabled},
        ${input.verificationStatus},${input.lastCheckedAt},${input.lastVerifiedAt})
      ON DUPLICATE KEY UPDATE
        connection_name=VALUES(connection_name),
        base_url=VALUES(base_url),
        api_key_ciphertext=VALUES(api_key_ciphertext),
        api_secret_ciphertext=VALUES(api_secret_ciphertext),
        enabled=VALUES(enabled),
        verification_status=VALUES(verification_status),
        last_checked_at=VALUES(last_checked_at),
        last_verified_at=VALUES(last_verified_at),
        updated_at=CURRENT_TIMESTAMP`.execute(this.database);
    return (await this.find())!;
  }

  async recordVerification(status: "live" | "offline", checkedAt: Date) {
    await sql`UPDATE frappe_connection_settings SET
      verification_status=${status},
      last_checked_at=${checkedAt},
      last_verified_at=CASE WHEN ${status}='live' THEN ${checkedAt} ELSE last_verified_at END,
      updated_at=CURRENT_TIMESTAMP
      WHERE connection_key='default'`.execute(this.database);
    return this.find();
  }

  async findSyncSettings() {
    const result = await sql<{
      enquiry_doctype: string;
      last_pull_at: Date | string | null;
      last_push_at: Date | string | null;
      pull_enquiries_enabled: boolean | number;
      push_enquiries_enabled: boolean | number;
      updated_at: Date | string;
    }>`SELECT enquiry_doctype,pull_enquiries_enabled,push_enquiries_enabled,last_pull_at,
      last_push_at,updated_at FROM frappe_sync_settings WHERE setting_key='enquiry' LIMIT 1`.execute(
      this.database
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      enquiryDoctype: "Enquiry" as const,
      lastPullAt: mapNullableTimestamp(row.last_pull_at),
      lastPushAt: mapNullableTimestamp(row.last_push_at),
      pullEnquiriesEnabled: Boolean(row.pull_enquiries_enabled),
      pushEnquiriesEnabled: Boolean(row.push_enquiries_enabled),
      updatedAt: timestamp(row.updated_at)
    };
  }

  async saveSyncSettings(input: FrappeSyncSettingsSavePayload) {
    await sql`UPDATE frappe_sync_settings SET
      pull_enquiries_enabled=${input.pullEnquiriesEnabled},
      push_enquiries_enabled=${input.pushEnquiriesEnabled}
      WHERE setting_key='enquiry'`.execute(this.database);
    return (await this.findSyncSettings())!;
  }

  async recordSync(direction: "pull" | "push") {
    if (direction === "pull") {
      await sql`UPDATE frappe_sync_settings SET last_pull_at=CURRENT_TIMESTAMP
        WHERE setting_key='enquiry'`.execute(this.database);
    } else {
      await sql`UPDATE frappe_sync_settings SET last_push_at=CURRENT_TIMESTAMP
        WHERE setting_key='enquiry'`.execute(this.database);
    }
  }

  async findLinkByFrappeName(frappeName: string) {
    return sql<{
      crm_enquiry_id: number;
      frappe_modified_at: Date | string | null;
      frappe_name: string;
    }>`SELECT crm_enquiry_id,frappe_name,frappe_modified_at FROM frappe_enquiry_links
      WHERE frappe_name=${frappeName} LIMIT 1`
      .execute(this.database)
      .then((result) => result.rows[0] ?? null);
  }

  async findLinkByCrmId(crmEnquiryId: number) {
    return sql<{ crm_enquiry_id: number; frappe_name: string }>`SELECT crm_enquiry_id,frappe_name
      FROM frappe_enquiry_links WHERE crm_enquiry_id=${crmEnquiryId} LIMIT 1`
      .execute(this.database)
      .then((result) => result.rows[0] ?? null);
  }

  async saveLink(input: {
    crmEnquiryId: number;
    frappeModifiedAt: string | null;
    frappeName: string;
  }) {
    await sql`INSERT INTO frappe_enquiry_links
      (uuid,crm_enquiry_id,frappe_name,frappe_modified_at,sync_status,last_synced_at)
      VALUES (${randomUuid(input.frappeName)},${input.crmEnquiryId},${input.frappeName},
        ${input.frappeModifiedAt},'synced',CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE crm_enquiry_id=VALUES(crm_enquiry_id),
        frappe_name=VALUES(frappe_name),frappe_modified_at=VALUES(frappe_modified_at),
        sync_status='synced',last_error=NULL,last_synced_at=CURRENT_TIMESTAMP`.execute(this.database);
  }
}

function mapConnection(row: FrappeConnectionRow): StoredFrappeConnection {
  return {
    apiKeyCiphertext: row.api_key_ciphertext,
    apiSecretCiphertext: row.api_secret_ciphertext,
    baseUrl: row.base_url,
    connectionName: row.connection_name,
    enabled: Boolean(row.enabled),
    id: Number(row.id),
    lastCheckedAt: mapNullableTimestamp(row.last_checked_at),
    lastVerifiedAt: mapNullableTimestamp(row.last_verified_at),
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : new Date(row.updated_at).toISOString(),
    uuid: row.uuid,
    verificationStatus: row.verification_status
  };
}

function mapNullableTimestamp(value: Date | string | null) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function timestamp(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function randomUuid(value: string) {
  return Buffer.from(value).toString("hex").slice(-8).padStart(8, "0");
}
