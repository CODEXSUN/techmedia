import { registerPlugin } from "@capacitor/core";

type LatestCall = { direction: "incoming" | "outgoing"; durationSeconds: number; id: string; number: string; occurredAt: number };
type CallHistoryPlugin = {
  addListener(eventName: "callCompleted", listenerFunc: (call: LatestCall) => void): Promise<{ remove: () => Promise<void> }>;
  getAttendedCallHistory(): Promise<{ calls: LatestCall[] }>;
  getLatestAttendedCall(): Promise<LatestCall>;
  startMonitoring(): Promise<void>;
};
const callHistory = registerPlugin<CallHistoryPlugin>("CallHistory");

export async function getLatestAttendedCall() {
  const call = await callHistory.getLatestAttendedCall();
  return normalizeCall(call);
}

export async function getAttendedCallHistory() {
  const { calls } = await callHistory.getAttendedCallHistory();
  return calls.map(normalizeCall);
}

export async function monitorCompletedCalls(onCallCompleted: (call: Awaited<ReturnType<typeof getLatestAttendedCall>>) => void) {
  const listener = await callHistory.addListener("callCompleted", (call) => onCallCompleted(normalizeCall(call)));
  await callHistory.startMonitoring();
  return () => void listener.remove();
}

function normalizeCall(call: LatestCall) { return { ...call, occurredAt: new Date(call.occurredAt).toISOString() }; }
