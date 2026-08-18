import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize } from "@capacitor/keyboard";

const config: CapacitorConfig = {
  appId: "in.techmedia.mobile",
  appName: "TechMedia",
  webDir: "../../dist/mobile/web",
  backgroundColor: "#f8fafc",
  plugins: {
    CapacitorHttp: { enabled: true },
    Keyboard: { resize: KeyboardResize.Body },
    SplashScreen: {
      backgroundColor: "#f8fafcff",
      launchAutoHide: false,
      showSpinner: false
    },
    SystemBars: { insetsHandling: "disable" },
    StatusBar: { backgroundColor: "#f8fafc", style: "LIGHT" }
  }
};

export default config;
