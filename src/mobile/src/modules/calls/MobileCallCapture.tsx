import { IonButton, IonIcon, IonSpinner, IonTextarea } from "@ionic/react";
import { callOutline, checkmarkCircleOutline, downloadOutline } from "ionicons/icons";
import { useEffect, useState } from "react";
import { getAttendedCallHistory, monitorCompletedCalls } from "./call-history";
import { captureMobileCall } from "./mobile-call-capture.api";

type Call = Awaited<ReturnType<typeof getAttendedCallHistory>>[number];

export function MobileCallCapture() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [selected, setSelected] = useState<Call | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState("");

  useEffect(() => {
    let remove = () => undefined;
    void monitorCompletedCalls((call) => {
      setCalls((current) => [call, ...current.filter((item) => item.id !== call.id)]);
      setSelected(call); setSaved(""); setError("");
    }).then((nextRemove) => { remove = nextRemove; }).catch(() => undefined);
    return () => remove();
  }, []);

  async function loadHistory() {
    setError(""); setLoading(true);
    try { setCalls(await getAttendedCallHistory()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load call history."); }
    finally { setLoading(false); }
  }

  async function saveCall() {
    if (!selected || !message.trim()) return;
    setError(""); setLoading(true);
    try {
      const enquiry = await captureMobileCall({ customerName, direction: selected.direction, durationSeconds: selected.durationSeconds, message, mobile: normalizeMobile(selected.number), occurredAt: selected.occurredAt });
      setSaved(`Saved as enquiry #${enquiry.id}.`); setMessage("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The call could not be saved."); }
    finally { setLoading(false); }
  }

  return <section className="techme-page techme-call-capture">
    <p className="techme-eyebrow">CALLS</p><h1>Call history</h1>
    <p className="techme-subtitle">Select an attended call, then record the customer request as a CRM enquiry.</p>
    <IonButton className="techme-call-import" disabled={loading} onClick={() => void loadHistory()}><IonIcon icon={downloadOutline} slot="start" />{loading ? <IonSpinner name="crescent" /> : "Refresh call history"}</IonButton>
    {calls.length ? <section className="techme-call-history" aria-label="Attended call history">{calls.map((call) => <button className={selected?.id === call.id ? "is-selected" : ""} key={call.id} onClick={() => { setSelected(call); setSaved(""); }} type="button"><IonIcon icon={callOutline} /><span><strong>{call.direction === "incoming" ? "Incoming call" : "Outgoing call"}</strong><small>{formatCall(call)}</small></span></button>)}</section> : null}
    {selected ? <section className="techme-call-card">
      <div><IonIcon icon={callOutline} /><span><strong>{selected.direction === "incoming" ? "Incoming call" : "Outgoing call"}</strong><small>{formatCall(selected)}</small></span></div>
      <label>Contact name <input onChange={(event) => setCustomerName(event.target.value)} placeholder="Optional, used in the enquiry title" value={customerName} /></label>
      <label>What did the customer ask? <IonTextarea autoGrow onIonInput={(event) => setMessage(event.detail.value ?? "")} placeholder="Type the request, issue, or follow-up" value={message} /></label>
      <IonButton disabled={loading || !message.trim()} onClick={() => void saveCall()}><IonIcon icon={checkmarkCircleOutline} slot="start" />{loading ? <IonSpinner name="crescent" /> : "Save as enquiry"}</IonButton>
    </section> : null}
    {saved ? <p className="techme-call-success">{saved}</p> : null}{error ? <p className="techme-error">{error}</p> : null}
  </section>;
}

function normalizeMobile(value: string) { const digits = value.replace(/\D/gu, ""); return digits.length === 10 ? digits : digits.slice(-10); }
function formatCall(call: Call) {
  const time = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(call.occurredAt));
  const duration = call.durationSeconds >= 60 ? `${Math.floor(call.durationSeconds / 60)}m ${call.durationSeconds % 60}s` : `${call.durationSeconds}s`;
  return `${call.number} · ${time} · ${duration}`;
}
