export const standardDeskPath = "/app/crm/overview";

export function canAccessAdministratorSettings(role: string | undefined) {
  return role === "admin";
}

export function applicationEntryPath(_role: string | undefined) {
  return standardDeskPath;
}
