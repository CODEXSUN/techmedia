import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

export async function initializeMobileRuntime() {
  document.documentElement.dataset.runtime = "mobile";
  if (!Capacitor.isNativePlatform()) return;

  const nativeSetup = [
    StatusBar.setBackgroundColor({ color: "#f8fafc" }),
    StatusBar.setStyle({ style: Style.Light })
  ];
  if (Capacitor.getPlatform() === "ios") {
    nativeSetup.push(Keyboard.setAccessoryBarVisible({ isVisible: false }));
  }
  await Promise.allSettled(nativeSetup);

  await App.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else void App.minimizeApp();
  });
}

export async function revealMobileApp() {
  if (Capacitor.isNativePlatform()) await SplashScreen.hide();
}
