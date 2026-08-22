import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize } from "@capacitor/keyboard";

const localAndroidApi = /^http:\/\/(10\.0\.2\.2|127\.0\.0\.1|localhost)(?::\d+)?(?:\/|$)/u.test(process.env.VITE_MOBILE_API_URL ?? "");

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
  },
  ...(localAndroidApi ? { server: { androidScheme: "http" } } : {})
};

export default config;
