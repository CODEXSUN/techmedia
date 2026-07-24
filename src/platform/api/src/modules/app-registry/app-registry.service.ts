import type {
  PlatformAppDefinition,
  PlatformAppId,
  PlatformAppSavePayload
} from "./app-registry.types.js";
import { AppRegistryRepository } from "./app-registry.repository.js";

export const defaultTenantModuleKeys = ["platform.application", "crm", "frappe"] as const;

export const platformAppRegistry: PlatformAppDefinition[] = [
  {
    alwaysEnabled: true,
    defaultLanding: false,
    description: "Platform workspace, tenant profile, application settings, users, and access.",
    appId: "application",
    id: 0,
    label: "Application",
    moduleKey: "platform.application",
    stack: "platform",
    uuid: ""
  },
  {
    alwaysEnabled: true,
    defaultLanding: true,
    description: "Enquiry ownership, open work, rich workspace notes, assignments, and schedules.",
    appId: "crm",
    id: 0,
    label: "CRM",
    moduleKey: "crm",
    stack: "platform",
    uuid: ""
  },
  {
    alwaysEnabled: true,
    defaultLanding: false,
    description: "Encrypted tenant connection settings for Frappe CRM integration.",
    appId: "frappe",
    id: 0,
    label: "Frappe",
    moduleKey: "frappe",
    stack: "platform",
    uuid: ""
  }
];

export function resolveEnabledApps(enabledModuleKeys: string[]) {
  const enabled = new Set(["platform.application", ...enabledModuleKeys]);
  return platformAppRegistry.map((app) => ({
    ...app,
    enabled: app.alwaysEnabled || enabled.has(app.moduleKey)
  }));
}

export function resolveLandingApp(value: unknown, enabledModuleKeys: string[]): PlatformAppId {
  const enabledApps = resolveEnabledApps(enabledModuleKeys).filter((app) => app.enabled);
  const requested = typeof value === "string" ? value : "";
  if (enabledApps.some((app) => app.appId === requested)) {
    return requested as PlatformAppId;
  }
  return enabledApps.some((app) => app.appId === "crm") ? "crm" : "application";
}

export class AppRegistryService {
  constructor(private readonly repository = new AppRegistryRepository()) {}
  listApps() {
    return this.repository.list();
  }
  createApp(input: PlatformAppSavePayload) {
    validateApp(input);
    return this.repository.create(input);
  }
  updateApp(id: string, input: PlatformAppSavePayload) {
    validateApp(input);
    return this.repository.update(Number(id), input);
  }
}

function validateApp(input: PlatformAppSavePayload) {
  if (!input.label.trim() || !input.moduleKey.trim())
    throw new Error("App label and module key are required.");
}
