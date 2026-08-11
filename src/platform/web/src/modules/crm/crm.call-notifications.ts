import { useCallback, useEffect, useRef, useState } from "react";
import { useCrmEnquiriesQuery } from "./crm.hooks";
import { getCrmEnquiry } from "./crm.services";
import type { CrmEnquiry, CrmEnquiryStatus } from "./crm.types";

type NotificationPermissionState = NotificationPermission | "unsupported";

type CallSnapshot = {
  assignedTo: string;
  status: CrmEnquiryStatus;
  updatedAt: string;
};

type CallNotification = {
  body: string;
  id: string;
  title: string;
};

export type CrmInAppNotification = CallNotification;

const pollInterval = 60_000;
export const crmInAppNotificationEvent = "techmedia:crm-in-app-notification";
const notificationPermissionEvent = "techmedia:browser-notification-permission";
const notificationPreferenceEvent = "techmedia:crm-call-notifications";
const notificationPreferenceStorageKey = "techmedia.crm.calls.notifications.enabled";

export function useCrmCallNotifications({
  actorIds,
  desktopEnabled,
  records
}: {
  actorIds: string[];
  desktopEnabled: boolean;
  records: CrmEnquiry[] | undefined;
}) {
  const browserNotifications = useBrowserNotificationPermission();
  const snapshots = useRef<Map<string, CallSnapshot> | null>(null);
  const actorKey = actorIds.join("|").toLowerCase();
  const storageKey = useRef(`techmedia.crm.calls.notifications.${actorKey}`);

  useEffect(() => {
    if (!records) return;
    if (snapshots.current === null) {
      snapshots.current = readSnapshots(storageKey.current) ?? snapshotsFor(records);
      writeSnapshots(storageKey.current, snapshots.current);
      return;
    }

    let cancelled = false;
    void detectChanges(records, snapshots.current, actorKey.split("|")).then((notifications) => {
      if (cancelled) return;
      writeSnapshots(storageKey.current, snapshots.current!);
      notifications.forEach(publishInAppNotification);
      if (desktopEnabled && browserNotifications.permission === "granted") {
        notifications.forEach(showNotification);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [actorKey, browserNotifications.permission, desktopEnabled, records]);

  return {
    ...browserNotifications,
    pollInterval,
  };
}

export function useBrowserNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermissionState>(notificationPermission);

  const refreshPermission = useCallback(() => {
    const nextPermission = notificationPermission();
    setPermission(nextPermission);
    return nextPermission;
  }, []);

  useEffect(() => {
    const sync = () => refreshPermission();
    window.addEventListener(notificationPermissionEvent, sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener(notificationPermissionEvent, sync);
      window.removeEventListener("focus", sync);
    };
  }, [refreshPermission]);

  const requestPermission = useCallback(async () => {
    if (!supportsNotifications()) return "unsupported" as const;
    const nextPermission = await Notification.requestPermission();
    setPermission(nextPermission);
    window.dispatchEvent(new Event(notificationPermissionEvent));
    return nextPermission;
  }, []);
  return { isSupported: permission !== "unsupported", permission, refreshPermission, requestPermission };
}

export function useCrmCallNotificationPreference() {
  const [enabled, setEnabledState] = useState(readNotificationPreference);

  useEffect(() => {
    const sync = () => setEnabledState(readNotificationPreference());
    window.addEventListener(notificationPreferenceEvent, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(notificationPreferenceEvent, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setEnabled = useCallback((nextEnabled: boolean) => {
    try {
      localStorage.setItem(notificationPreferenceStorageKey, String(nextEnabled));
    } catch {}
    setEnabledState(nextEnabled);
    window.dispatchEvent(new Event(notificationPreferenceEvent));
  }, []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(notificationPreferenceStorageKey);
    } catch {}
    setEnabledState(true);
    window.dispatchEvent(new Event(notificationPreferenceEvent));
  }, []);

  return { enabled, reset, setEnabled };
}

export function CrmCallNotificationListener({ actorIds }: { actorIds: string[] }) {
  const notificationPreference = useCrmCallNotificationPreference();
  const query = useCrmEnquiriesQuery({ view: "created" }, { poll: true });
  useCrmCallNotifications({
    actorIds,
    desktopEnabled: notificationPreference.enabled,
    records: query.data
  });
  return null;
}

export function sendCrmTestNotification() {
  if (!supportsNotifications() || Notification.permission !== "granted") return false;
  const notification = {
    body: "Windows alerts are working for your My Calls.",
    id: "test",
    title: "TechMedia notification test"
  };
  publishInAppNotification(notification);
  showNotification(notification);
  return true;
}

async function detectChanges(
  records: CrmEnquiry[],
  snapshots: Map<string, CallSnapshot>,
  actorIds: string[]
) {
  const notifications: CallNotification[] = [];
  const actorKeys = new Set(actorIds.map(normalize).filter(Boolean));
  for (const record of records) {
    const previous = snapshots.get(record.frappeName);
    if (!previous) {
      snapshots.set(record.frappeName, snapshotFor(record));
      continue;
    }
    if (previous.updatedAt === record.updatedAt) continue;
    notifications.push(...(await notificationsFor(record, previous, actorKeys)));
    snapshots.set(record.frappeName, snapshotFor(record));
  }
  return notifications;
}

async function notificationsFor(
  record: CrmEnquiry,
  previous: CallSnapshot,
  actorKeys: Set<string>
) {
  const notifications: CallNotification[] = [];
  if (actorKeys.has(normalize(record.updatedByUserId))) return notifications;
  const assignedTo = record.assignedTo?.name ?? "Unassigned";
  if (assignedTo !== previous.assignedTo) {
    notifications.push(notification(record, "assignment", `Assigned to ${assignedTo}.`));
  }
  if (record.status !== previous.status) {
    notifications.push(notification(record, "status", `Status changed to ${statusLabel(record.status)}.`));
  }

  try {
    const latest = await getCrmEnquiry(record.frappeName);
    const reply = latest.messages.at(-1);
    if (
      reply &&
      !reply.isSuspended &&
      !actorKeys.has(normalize(reply.createdByUserId)) &&
      Date.parse(reply.createdAt) >= Date.parse(previous.updatedAt)
    ) {
      notifications.push(notification(record, `reply-${reply.id}`, `New reply: ${plainText(reply.comment)}`));
    }
  } catch {
    // The list update remains useful when the detail request is temporarily unavailable.
  }
  return notifications;
}

function notification(record: CrmEnquiry, type: string, body: string): CallNotification {
  return {
    body: `Call #${record.id}: ${trim(body, 180)}`,
    id: `${record.frappeName}-${type}`,
    title: trim(plainText(record.title || record.workspace || `Call #${record.id}`), 72)
  };
}

function showNotification(value: CallNotification) {
  const browserNotification = new Notification(value.title, {
    body: value.body,
    tag: `techmedia-crm-${value.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  });
  browserNotification.onclick = () => window.focus();
}

function publishInAppNotification(value: CrmInAppNotification) {
  window.dispatchEvent(
    new CustomEvent<CrmInAppNotification>(crmInAppNotificationEvent, { detail: value })
  );
}

function snapshotsFor(records: CrmEnquiry[]) {
  return new Map(records.map((record) => [record.frappeName, snapshotFor(record)]));
}

function snapshotFor(record: CrmEnquiry): CallSnapshot {
  return {
    assignedTo: record.assignedTo?.name ?? "Unassigned",
    status: record.status,
    updatedAt: record.updatedAt
  };
}

function readSnapshots(key: string) {
  try {
    const value = sessionStorage.getItem(key);
    if (!value) return null;
    return new Map<string, CallSnapshot>(JSON.parse(value) as Array<[string, CallSnapshot]>);
  } catch {
    return null;
  }
}

function writeSnapshots(key: string, snapshots: Map<string, CallSnapshot>) {
  try {
    sessionStorage.setItem(key, JSON.stringify([...snapshots]));
  } catch {}
}

function notificationPermission(): NotificationPermissionState {
  return supportsNotifications() ? Notification.permission : "unsupported";
}

function readNotificationPreference() {
  try {
    return localStorage.getItem(notificationPreferenceStorageKey) !== "false";
  } catch {
    return true;
  }
}

function supportsNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function plainText(value: string) {
  return value.replace(/<[^>]*>/gu, " ").replace(/\s+/gu, " ").trim();
}

function statusLabel(value: CrmEnquiryStatus) {
  return value.replace(/-/gu, " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

function trim(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length - 1).trimEnd()}…` : value;
}
