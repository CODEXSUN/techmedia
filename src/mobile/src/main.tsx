import { createRoot } from "react-dom/client";
import { setupIonicReact } from "@ionic/react";
import { configureSessionStore } from "../../platform/web/src/shared/auth/session-store";
import { NativeSessionStore } from "./auth/native-session-store";
import { MobileApp } from "./app/MobileApp";
import { initializeMobileRuntime, revealMobileApp } from "./runtime/mobile-runtime";
import "@ionic/react/css/core.css";
import "./mobile.css";

setupIonicReact({ mode: "md" });

async function startMobileApp() {
  document.documentElement.dataset.mobileDensity = "comfortable";
  requiredElement("mobile-boot-version").textContent = `Version ${__APP_VERSION__}`;
  const sessionStore = new NativeSessionStore();
  configureSessionStore(sessionStore);
  await Promise.all([sessionStore.hydrate(), initializeMobileRuntime()]);

  createRoot(requiredElement("root")).render(<MobileApp authenticated={Boolean(sessionStore.get())} />);
  await revealMobileApp();
}

function requiredElement(id: string) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing mobile application element: ${id}`);
  return element;
}

void startMobileApp();
