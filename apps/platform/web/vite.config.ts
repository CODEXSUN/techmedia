import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { requireEnvNumber, requireEnvValue } from "@codexsun/framework/env";

const configDir = fileURLToPath(new URL(".", import.meta.url));
const repositoryDir = resolve(configDir, "../../..");
const workspaceDir = resolve(repositoryDir, "..");
const platformSourceRoots = [
  repositoryDir,
  resolve(workspaceDir, "core"),
  resolve(workspaceDir, "framework"),
  resolve(workspaceDir, "ui")
];
const rootPackage = JSON.parse(readFileSync(resolve(repositoryDir, "package.json"), "utf8")) as {
  version: string;
};

export default defineConfig(({ command, mode }) => {
  const runtimeEnv = {
    ...loadEnv(mode, repositoryDir, ""),
    ...process.env
  };

  return {
    build: {
      chunkSizeWarningLimit: 900,
      emptyOutDir: true,
      outDir: "../../../dist/apps/platform/web",
      reportCompressedSize: false
    },
    cacheDir: "../../../node_modules/.vite/platform-web",
    envDir: "../../..",
    optimizeDeps: {
      entries: ["src/main.tsx"],
      include: [
        "@dnd-kit/core",
        "@dnd-kit/modifiers",
        "@dnd-kit/sortable",
        "@dnd-kit/utilities",
        "@tanstack/react-query",
        "@tanstack/react-router",
        "@tanstack/react-table",
        "date-fns",
        "framer-motion",
        "lucide-react",
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-dev-runtime",
        "react/jsx-runtime",
        "recharts",
        "sonner",
        "zod"
      ]
    },
    define: {
      __APP_VERSION__: JSON.stringify(rootPackage.version),
      "import.meta.env.VITE_DEV_AUTO_TENANT_LOGIN": JSON.stringify(
        runtimeEnv.DEV_AUTO_TENANT_LOGIN ?? "0"
      ),
      "import.meta.env.VITE_PLATFORM_API_URL": JSON.stringify("/api/platform"),
      "import.meta.env.VITE_TENANT_NAME": JSON.stringify(
        runtimeEnv.DEFAULT_TENANT_NAME || "TechMedia"
      )
    },
    plugins: [tailwindcss(), react()],
    resolve: {
      dedupe: ["react", "react-dom"]
    },
    ...(command === "serve"
      ? {
          server: {
            allowedHosts: ["techmedia.test", "localhost", "127.0.0.1"],
            fs: {
              allow: platformSourceRoots
            },
            headers: {
              "Permissions-Policy": "unload=*"
            },
            host: "127.0.0.1",
            port: requireEnvNumber(runtimeEnv.PLATFORM_WEB_PORT, "PLATFORM_WEB_PORT"),
            warmup: {
              clientFiles: [
                "./src/main.tsx",
                "./src/app/PlatformWebApp.tsx",
                "./src/app/router.tsx",
                "./src/public/login/LoginPage.tsx"
              ]
            },
            proxy: {
              "/api/core": {
                changeOrigin: false,
                rewrite: (path) => path.replace(/^\/api\/core/u, "") || "/",
                target: platformApiTarget(runtimeEnv)
              },
              "/api/platform": {
                changeOrigin: false,
                rewrite: (path) => path.replace(/^\/api\/platform/u, "") || "/",
                target: platformApiTarget(runtimeEnv)
              }
            }
          }
        }
      : {})
  };
});

function platformApiTarget(runtimeEnv: Record<string, string | undefined>) {
  return requireEnvValue(runtimeEnv.PLATFORM_API_URL, "PLATFORM_API_URL");
}
