import { IonIcon, IonSpinner } from "@ionic/react";
import {
  arrowBackOutline,
  alertCircleOutline,
  callOutline,
  chatboxOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  ellipsisVertical,
  ellipseOutline,
  locationOutline,
  logoWhatsapp,
  playOutline,
  stopOutline
} from "ionicons/icons";
import { useEffect, useMemo, useState } from "react";
import type { CrmEnquiry, CrmEnquiryOverview } from "../../../../platform/web/src/modules/crm/crm.types";
import {
  addMobileJobComment,
  getMobileJobSummary,
  listMobileJobs,
  startMobileJob,
  stopMobileJob
} from "./mobile-jobs.api";

type JobFilter = "active" | "closed" | "in-progress";

export function MobileMyJobs() {
  const [filter, setFilter] = useState<JobFilter>("active");
  const [overview, setOverview] = useState<CrmEnquiryOverview | null>(null);
  const [records, setRecords] = useState<CrmEnquiry[]>([]);
  const [selected, setSelected] = useState<CrmEnquiry | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [nextRecords, nextOverview] = await Promise.all([
        listMobileJobs(filter),
        getMobileJobSummary()
      ]);
      setRecords(nextRecords);
      setOverview(nextOverview);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "My Jobs could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [filter]);

  if (selected) {
    return <MobileJobDetail onBack={() => setSelected(null)} onRecordChange={setSelected} record={selected} />;
  }

  return (
    <section className="techme-jobs-page bg-background text-foreground">
      <div className="techme-page-heading"><h1>My Jobs</h1></div>
      <div className="techme-job-summary" aria-label="My job summary">
        <SummaryCard active={filter === "active"} count={overview?.stats.myJob.total ?? 0} label="Jobs" onClick={() => setFilter("active")} />
        <SummaryCard active={filter === "in-progress"} count={overview?.stats.myJob.inProgress ?? 0} label="Actions" onClick={() => setFilter("in-progress")} />
        <SummaryCard active={filter === "closed"} count={closedCount(overview)} label="Closed" onClick={() => setFilter("closed")} />
      </div>
      {loading ? <State label="Loading your Frappe jobs…" /> : null}
      {!loading && error ? <State label={error} tone="error" /> : null}
      {!loading && !error && records.length === 0 ? <State label="No assigned jobs in this view." /> : null}
      {!loading && !error ? (
        <div className="techme-job-list">
          {records.map((record) => <JobCard key={record.frappeName} onOpen={() => setSelected(record)} record={record} />)}
        </div>
      ) : null}
    </section>
  );
}

function MobileJobDetail({ onBack, onRecordChange, record }: { onBack: () => void; onRecordChange: (record: CrmEnquiry) => void; record: CrmEnquiry }) {
  const [actionOpen, setActionOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const runningJob = useMemo(() => record.jobs.find((job) => job.status === "Running"), [record.jobs]);

  async function update(operation: () => Promise<CrmEnquiry>) {
    setPending(true);
    try {
      onRecordChange(await operation());
    } finally {
      setPending(false);
    }
  }

  async function saveComment() {
    const value = comment.trim();
    if (!value) return;
    await update(() => addMobileJobComment(record.frappeName, value));
    setComment("");
  }

  return (
    <section className="techme-job-detail">
      <header className="techme-job-detail-header">
        <button aria-label="Back to My Jobs" className="techme-icon-button" onClick={onBack} type="button"><IonIcon icon={arrowBackOutline} /></button>
        <div><strong>Job details</strong><small>Live Frappe enquiry</small></div>
      </header>
      <JobCard record={record} />
      <section className="techme-job-timeline" aria-label="Job activity">
        <h2>Activity</h2>
        {record.messages.length ? record.messages.slice().reverse().map((message) => (
          <article key={message.id}><span><IonIcon icon={chatboxOutline} /></span><div><p>{message.comment}</p><time>{formatDateTime(message.createdAt)}</time></div></article>
        )) : <p className="techme-subtitle">No activity has been recorded yet.</p>}
      </section>
      <footer className="techme-job-footer">
        {actionOpen ? <ActionSheet comment={comment} onCommentChange={setComment} onClose={() => setActionOpen(false)} onLocate={() => navigator.geolocation?.getCurrentPosition(() => undefined)} onSaveComment={() => void saveComment()} onStartStop={() => void update(() => runningJob ? stopMobileJob(record.frappeName, runningJob.name) : startMobileJob(record.frappeName))} pending={pending} running={Boolean(runningJob)} /> : null}
        <button className="techme-job-add" onClick={() => setActionOpen((value) => !value)} type="button">{actionOpen ? "Close actions" : "Add activity"}</button>
      </footer>
    </section>
  );
}

function JobCard({ onOpen, record }: { onOpen?: () => void; record: CrmEnquiry }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const phone = record.mobile.replace(/\D/gu, "");
  const detail = plainText(record.workspace);
  return <article className={`techme-job-card is-${record.priority} bg-card text-card-foreground border-border shadow-sm`} onClick={onOpen}>
    <div className="techme-job-card-top"><i aria-label={`${record.priority} priority`} role="img" /><span>#{record.id}</span><em>·</em><small>{record.enquiryGroup || "Enquiries"}</small><strong>{record.assignedTo?.name ?? "Unassigned"}</strong><button aria-label="Job actions" className="techme-icon-button" onClick={(event) => { event.stopPropagation(); setMenuOpen((value) => !value); }} type="button"><IonIcon icon={ellipsisVertical} /></button></div>
    <p className="techme-job-customer">{record.customerName || record.customer || "Customer enquiry"}</p>
    <h2>{plainText(record.title) || "Untitled enquiry"}</h2>
    <p className="techme-job-enquiry-detail">{detail}</p>
    <div className="techme-job-card-bottom"><time>{relativeTime(record.updatedAt)} · Due {formatDueDate(record.schedules[0]?.scheduledOn)}</time><span className={`techme-job-status is-${record.status}`}><IonIcon icon={statusIcon(record.status)} />{record.status.replaceAll("-", " ")}</span></div>
    {menuOpen ? <nav className="techme-job-menu" onClick={(event) => event.stopPropagation()}><a href={phone ? `tel:${phone}` : undefined}><IonIcon icon={callOutline} />Call</a><a href={phone ? `https://wa.me/91${phone}` : undefined} rel="noreferrer" target="_blank"><IonIcon icon={logoWhatsapp} />WhatsApp</a><button onClick={() => navigator.geolocation?.getCurrentPosition(() => undefined)} type="button"><IonIcon icon={locationOutline} />Location</button></nav> : null}
  </article>;
}

function ActionSheet({ comment, onClose, onCommentChange, onLocate, onSaveComment, onStartStop, pending, running }: { comment: string; onClose: () => void; onCommentChange: (value: string) => void; onLocate: () => void; onSaveComment: () => void; onStartStop: () => void; pending: boolean; running: boolean }) {
  return <section className="techme-job-actions"><div className="techme-job-action-heading"><strong>Actions</strong><button onClick={onClose} type="button">Close</button></div><button disabled={pending} onClick={onStartStop} type="button"><IonIcon icon={running ? stopOutline : playOutline} />{running ? "End job" : "Start job"}</button><button onClick={onLocate} type="button"><IonIcon icon={locationOutline} />Capture location</button><label>Add comment<textarea onChange={(event) => onCommentChange(event.target.value)} placeholder="Update this job" value={comment} /></label><button disabled={pending || !comment.trim()} onClick={onSaveComment} type="button"><IonIcon icon={chatboxOutline} />Save comment</button></section>;
}

function SummaryCard({ active, count, label, onClick }: { active: boolean; count: number; label: string; onClick: () => void }) { return <button className={active ? "is-active" : ""} onClick={onClick} type="button"><span>{label}</span><strong>{count}</strong></button>; }
function State({ label, tone }: { label: string; tone?: "error" }) { return <div className={`techme-job-state ${tone === "error" ? "is-error" : ""}`}>{label.includes("Loading") ? <IonSpinner name="crescent" /> : null}<span>{label}</span></div>; }
function closedCount(overview: CrmEnquiryOverview | null) { return overview?.stats.myJob.statusCounts.filter(({ statusGroup }) => statusGroup === "closed").reduce((sum, item) => sum + item.count, 0) ?? 0; }
function plainText(value: string) { return value.replace(/<[^>]*>/gu, " ").replace(/\s+/gu, " ").trim(); }
function relativeTime(value: string) { const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000)); return days === 0 ? "Today" : `${days} day${days === 1 ? "" : "s"} ago`; }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("en-IN", { day: "numeric", hour: "numeric", minute: "2-digit", month: "short", timeZone: "Asia/Kolkata" }).format(new Date(value)); }
function formatDueDate(value: string | undefined) { return value ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(new Date(`${value}T00:00:00+05:30`)) : "—"; }
function statusIcon(status: CrmEnquiry["status"]) { if (status === "won") return checkmarkCircleOutline; if (status === "lost") return closeCircleOutline; if (status === "escalation") return alertCircleOutline; return ellipseOutline; }
