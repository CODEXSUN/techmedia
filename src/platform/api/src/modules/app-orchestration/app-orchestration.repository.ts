import { createConnection } from "node:net";
import { env } from "../../env.js";
import type {
  OrchestratedApp,
  OrchestratedAppReadiness,
  OrchestratedComponent,
  OrchestratedService
} from "./app-orchestration.types.js";

type ApplicationBundle = {
  components: readonly OrchestratedComponent[];
  description: string;
  id: string;
  label: string;
  packageName: string;
  readiness: Exclude<OrchestratedAppReadiness, "runtime">;
};

const applicationBundles: readonly ApplicationBundle[] = [];

const apiUrl = new URL(env.PLATFORM_API_URL);
const webUrl = new URL(env.PLATFORM_WEB_HEALTH_URL || env.PLATFORM_WEB_ORIGIN);
const platformDefinition = {
  components: [],
  description: "The TECHMEDIA runtime that composes repository-owned application bundles.",
  id: "platform",
  kind: "runtime",
  label: "Platform",
  managed: false,
  packageName: "techmedia",
  readiness: "runtime",
  services: [
    { id: "api", label: "API", host: apiUrl.hostname, port: env.PLATFORM_API_PORT },
    {
      id: "web",
      label: "Web",
      host: webUrl.hostname,
      port: Number(webUrl.port || (webUrl.protocol === "https:" ? 443 : 80))
    }
  ]
} as const;

export class AppOrchestrationRepository {
  definition(id: string) {
    if (id === platformDefinition.id) return platformDefinition;
    return applicationBundles.find((bundle) => bundle.id === id) ?? null;
  }

  async list(): Promise<OrchestratedApp[]> {
    const services = await Promise.all(platformDefinition.services.map(probe));
    const online = services.filter((item) => item.online).length;
    const platform: OrchestratedApp = {
      ...platformDefinition,
      components: [],
      lastAction: null,
      services,
      status: online === 0 ? "offline" : online === services.length ? "online" : "partial",
      terminalPid: null,
      uptimeSeconds: null
    };

    return [platform, ...applicationBundles.map(toOrchestratedBundle)];
  }
}

function toOrchestratedBundle(bundle: ApplicationBundle): OrchestratedApp {
  return {
    ...bundle,
    components: [...bundle.components],
    kind: "bundle",
    lastAction: null,
    managed: false,
    services: [],
    status: "connected",
    terminalPid: null,
    uptimeSeconds: null
  };
}

async function probe(
  input: (typeof platformDefinition.services)[number]
): Promise<OrchestratedService> {
  const started = Date.now();
  const online = await new Promise<boolean>((resolve) => {
    const socket = createConnection({ host: input.host, port: input.port });
    socket.setTimeout(700);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => resolve(false));
  });
  return {
    ...input,
    managedPid: null,
    online,
    responseMs: online ? Date.now() - started : null,
    uptimeSeconds: null
  };
}
