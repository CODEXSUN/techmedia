export const administratorDeskPath = "/app/identity/users";
export const standardDeskPath = "/app/crm/overview";

export function canAccessAdministratorSettings(role: string | undefined) {
  return role === "admin";
}

export function canSelectApplicationTheme(role: string | undefined) {
  return canAccessAdministratorSettings(role);
}

export function applicationEntryPath(role: string | undefined) {
  return canAccessAdministratorSettings(role) ? administratorDeskPath : standardDeskPath;
}
