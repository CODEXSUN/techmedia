import { Capacitor, registerPlugin } from "@capacitor/core";
import { IonAlert } from "@ionic/react";
import { useEffect, useState } from "react";

const defaultManifestUrl =
  "https://github.com/CODEXSUN/techmedia/releases/latest/download/latest.json";

type ReleaseManifest = {
  apkUrl: string;
  mandatory: boolean;
  sha256: string;
  versionCode: number;
  versionName: string;
};

type MobileReleaseUpdaterPlugin = {
  getInstalledVersion(): Promise<{ versionCode: number; versionName: string }>;
  installRelease(options: { apkUrl: string; sha256: string }): Promise<{ permissionRequired?: boolean }>;
};

const MobileReleaseUpdaterNative = registerPlugin<MobileReleaseUpdaterPlugin>("MobileReleaseUpdater");

export function MobileReleaseUpdater() {
  const [availableRelease, setAvailableRelease] = useState<ReleaseManifest>();
  const [message, setMessage] = useState<string>();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void checkForRelease().then((release) => {
      if (!release) return;
      setAvailableRelease(release);
      setOpen(true);
    });
  }, []);

  async function installUpdate() {
    if (!availableRelease) return;
    try {
      const result = await MobileReleaseUpdaterNative.installRelease({
        apkUrl: availableRelease.apkUrl,
        sha256: availableRelease.sha256
      });
      if (result.permissionRequired) {
        setMessage("Allow installs from TechMedia in Android settings, then tap Update again.");
        setOpen(true);
      }
    } catch {
      setMessage("The update could not start. Check the connection and try again.");
      setOpen(true);
    }
  }

  return (
    <IonAlert
      buttons={[
        ...(availableRelease?.mandatory
          ? []
          : [
              {
                role: "cancel" as const,
                text: "Later"
              }
            ]),
        {
          handler: () => void installUpdate(),
          text: "Update"
        }
      ]}
      header={message ? "Installation permission needed" : "Update available"}
      isOpen={open}
      message={message ?? `Version ${availableRelease?.versionName ?? ""} is ready to install.`}
      onDidDismiss={() => setOpen(false)}
    />
  );
}

async function checkForRelease(): Promise<ReleaseManifest | undefined> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return undefined;

  try {
    const [installed, response] = await Promise.all([
      MobileReleaseUpdaterNative.getInstalledVersion(),
      fetch(import.meta.env.VITE_MOBILE_UPDATE_MANIFEST_URL || defaultManifestUrl, {
        cache: "no-store"
      })
    ]);
    if (!response.ok) return undefined;

    const release = readManifest(await response.json());
    return release && release.versionCode > installed.versionCode ? release : undefined;
  } catch {
    return undefined;
  }
}

function readManifest(value: unknown): ReleaseManifest | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (
    typeof record.apkUrl !== "string" ||
    !trustedReleaseUrl(record.apkUrl) ||
    typeof record.mandatory !== "boolean" ||
    typeof record.sha256 !== "string" ||
    !/^[a-f\d]{64}$/iu.test(record.sha256) ||
    !Number.isSafeInteger(record.versionCode) ||
    typeof record.versionName !== "string"
  ) {
    return undefined;
  }
  return record as ReleaseManifest;
}

function trustedReleaseUrl(value: string) {
  return value.startsWith("https://github.com/CODEXSUN/techmedia/releases/download/");
}
