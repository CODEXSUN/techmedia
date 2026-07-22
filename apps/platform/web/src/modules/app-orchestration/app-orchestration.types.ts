export type OrchestratedAppId = string;
export type OrchestratedAppStatus = "connected" | "offline" | "online" | "partial";

export interface OrchestratedComponent {
  id: string;
  label: string;
}

export interface OrchestratedService {
  id: "api" | "web";
  label: string;
  host: string;
  managedPid: number | null;
  port: number;
  online: boolean;
  responseMs: number | null;
  uptimeSeconds: number | null;
}

export interface OrchestratedApp {
  id: OrchestratedAppId;
  label: string;
  description: string;
  kind: "bundle" | "runtime";
  packageName: string;
  readiness: "active" | "boundary" | "runtime";
  status: OrchestratedAppStatus;
  managed: boolean;
  terminalPid: number | null;
  uptimeSeconds: number | null;
  lastAction: string | null;
  components: OrchestratedComponent[];
  services: OrchestratedService[];
}
