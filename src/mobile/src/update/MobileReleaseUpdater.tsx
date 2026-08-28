import { Capacitor, registerPlugin } from "@capacitor/core";
import { IonAlert } from "@ionic/react";
import { useCallback, useEffect, useState } from "react";

const manifestUrl = `${import.meta.env.VITE_PLATFORM_API_URL}/mobile/release/latest.json`;

export type ReleaseManifest = {
  apkUrl: string;
  mandatory: boolean;
  sha256: string;
  versionCode: number;
  versionName: string;
};

type InstalledVersion = {
  versionCode: number;
  versionName: string;
};

type MobileReleaseUpdaterPlugin = {
  getInstalledVersion(): Promise<InstalledVersion>;
  installRelease(options: { apkUrl: string; sha256: string }): Promise<{ permissionRequired?: boolean }>;
};

export type MobileReleaseUpdateState = {
  availableRelease: ReleaseManifest | undefined;
  checking: boolean;
  checkForUpdate: () => Promise<void>;
  installedVersion: InstalledVersion | undefined;
  status: string | undefined;
};

const MobileReleaseUpdaterNative = registerPlugin<MobileReleaseUpdaterPlugin>("MobileReleaseUpdater");

export function useMobileReleaseUpdater(authenticated: boolean): MobileReleaseUpdateState {
  const [availableRelease, setAvailableRelease] = useState<ReleaseManifest>();
  const [checking, setChecking] = useState(false);
  const [installedVersion, setInstalledVersion] = useState<InstalledVersion>();
  const [status, setStatus] = useState<string>();

  const checkForUpdate = useCallback(async () => {
    setChecking(true);
    setStatus(undefined);
    const result = await loadReleaseUpdate();
    setChecking(false);
    if (!result) {
      setStatus("Update checks are available on the Android app.");
      return;
    }
    setInstalledVersion(result.installed);
    setAvailableRelease(result.release);
    setStatus(result.release ? undefined : "TechMedia is up to date.");
  }, []);

  useEffect(() => {
    if (authenticated) void checkForUpdate();
  }, [authenticated, checkForUpdate]);

  return { availableRelease, checking, checkForUpdate, installedVersion, status };
}

export function MobileReleaseUpdateDialog({
  onDismiss,
  open,
  release
}: {
  onDismiss: () => void;
  open: boolean;
  release: ReleaseManifest | undefined;
}) {
  const [message, setMessage] = useState<string>();

  async function installUpdate() {
    if (!release) return;
    try {
      const result = await MobileReleaseUpdaterNative.installRelease({
        apkUrl: release.apkUrl,
        sha256: release.sha256
      });
      if (result.permissionRequired) {
        setMessage("Allow installs from TechMedia in Android settings, then tap Update again.");
      }
    } catch {
      setMessage("The update could not start. Check the connection and try again.");
    }
  }

  return (
    <IonAlert
      buttons={[
        ...(release?.mandatory ? [] : [{ role: "cancel" as const, text: "Later" }]),
        { handler: () => void installUpdate(), text: "Update" }
      ]}
      header={message ? "Installation permission needed" : "Update available"}
      isOpen={open}
      message={message ?? `Version ${release?.versionName ?? ""} is ready to install.`}
      onDidDismiss={() => {
        setMessage(undefined);
        onDismiss();
      }}
    />
  );
}

async function loadReleaseUpdate(): Promise<
  { installed: InstalledVersion; release?: ReleaseManifest } | undefined
> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return undefined;

  try {
    const [installed, response] = await Promise.all([
      MobileReleaseUpdaterNative.getInstalledVersion(),
      fetch(manifestUrl, { cache: "no-store" })
    ]);
    if (!response.ok) return { installed };

    const release = readManifest(await response.json());
    return {
      installed,
      ...(release && release.versionCode > installed.versionCode ? { release } : {})
    };
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
  try {
    const release = new URL(value);
    const api = new URL(import.meta.env.VITE_PLATFORM_API_URL);
    return (
      release.origin === api.origin &&
      release.pathname.startsWith(`${api.pathname.replace(/\/$/u, "")}/mobile/release/`)
    );
  } catch {
    return false;
  }
}
