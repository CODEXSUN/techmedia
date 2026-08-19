import { createRoot } from "react-dom/client";
import { setupIonicReact } from "@ionic/react";
import { PlatformWebApp } from "../../platform/web/src/app/PlatformWebApp";
import { configureMobileCrmListRenderer } from "../../platform/web/src/modules/crm/crm.list";
import { configureSessionStore } from "../../platform/web/src/shared/auth/session-store";
import { NativeSessionStore } from "./auth/native-session-store";
import { MobileCrmList } from "./modules/crm/MobileCrmList";
import { initializeMobileRuntime, revealMobileApp } from "./runtime/mobile-runtime";
import { MobileReleaseUpdater } from "./update/MobileReleaseUpdater";
import "@ionic/react/css/core.css";
import "../../platform/web/src/styles.css";
import "./mobile.css";

setupIonicReact({ mode: "md" });
configureMobileCrmListRenderer((props) => <MobileCrmList {...props} />);

async function startMobileApp() {
  document.documentElement.dataset.mobileDensity = "comfortable";
  const sessionStore = new NativeSessionStore();
  configureSessionStore(sessionStore);
  await Promise.all([sessionStore.hydrate(), initializeMobileRuntime()]);

  createRoot(requiredElement("root")).render(<PlatformWebApp />);
  createRoot(requiredElement("mobile-update")).render(<MobileReleaseUpdater />);
  await revealMobileApp();
}

function requiredElement(id: string) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing mobile application element: ${id}`);
  return element;
}

void startMobileApp();
