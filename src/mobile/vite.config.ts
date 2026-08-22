import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import { resolve } from "node:path";

const mobileDir = import.meta.dirname;
const repositoryDir = resolve(mobileDir, "../..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repositoryDir, "");
  const apiUrl = requiredMobileApiUrl(env.VITE_MOBILE_API_URL);

  return {
    build: {
      // Ionic React ships its component registry as one upstream module. Its
      // isolated vendor chunk is intentionally kept below this explicit budget.
      chunkSizeWarningLimit: 1_200,
      emptyOutDir: true,
      outDir: "../../dist/mobile/web",
      reportCompressedSize: false,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: "ionic-react-vendor",
                priority: 100,
                test: /node_modules[\\/]@ionic[\\/]react[\\/]/
              },
              {
                name: "ionic-core-vendor",
                priority: 99,
                test: /node_modules[\\/]@ionic[\\/]core[\\/]/
              },
              {
                name: "ionicons-vendor",
                priority: 98,
                test: /node_modules[\\/]ionicons[\\/]/
              },
              {
                name: "capacitor-vendor",
                priority: 97,
                test: /node_modules[\\/]@capacitor[\\/]/
              },
              {
                name: "react-vendor",
                priority: 90,
                test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/
              }
            ]
          }
        }
      }
    },
    cacheDir: "../../node_modules/.vite/mobile",
    envDir: repositoryDir,
    publicDir: "../platform/web/public",
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "development"),
      "import.meta.env.VITE_DEV_AUTO_LOGIN": JSON.stringify("0"),
      "import.meta.env.VITE_PLATFORM_API_URL": JSON.stringify(apiUrl)
    },
    plugins: [tailwindcss(), react()],
    resolve: {
      dedupe: ["@tanstack/react-query", "react", "react-dom"]
    }
  };
});

function requiredMobileApiUrl(value: string | undefined) {
  if (!value?.trim()) throw new Error("VITE_MOBILE_API_URL is required for the mobile app.");
  const url = new URL(value.trim());
  if (url.protocol !== "https:" && !isLocalDevelopmentUrl(url)) {
    throw new Error("VITE_MOBILE_API_URL must use HTTPS outside local development.");
  }
  return url.toString().replace(/\/$/u, "");
}

function isLocalDevelopmentUrl(url: URL) {
  return url.hostname === "127.0.0.1" || url.hostname === "10.0.2.2" || url.hostname === "localhost";
}
