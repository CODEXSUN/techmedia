import { IonApp, IonButton, IonContent, IonIcon, IonInput, IonSpinner } from "@ionic/react";
import { callOutline, chatbubbleEllipsesOutline, gridOutline, homeOutline, notificationsOutline, personOutline } from "ionicons/icons";
import { useState } from "react";
import { login } from "../../../platform/web/src/shared/api/platform-api";
import { getToken } from "../../../platform/web/src/shared/api/platform-api";
import { MobileMessenger } from "../messaging/MobileMessenger";

type MobileTab = "calls" | "chats" | "home";

export function MobileApp({ authenticated }: { authenticated: boolean }) {
  const [signedIn, setSignedIn] = useState(authenticated);
  const [email, setEmail] = useState(() => emailFromToken());
  const [tab, setTab] = useState<MobileTab>("home");
  return <IonApp>{signedIn ? <MobileDesk actorEmail={email} tab={tab} onTabChange={setTab} /> : <MobileLogin onSignedIn={(value) => { setEmail(value); setSignedIn(true); }} />}</IonApp>;
}

function MobileLogin({ onSignedIn }: { onSignedIn: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setPending(true);
    const result = await login({ email, password }); setPending(false);
    if (result.success) onSignedIn(result.data.email); else setError(result.error.message);
  }
  return <IonContent fullscreen className="techme-surface"><main className="techme-login"><section className="techme-brand"><img alt="Tech Media" src="/logo/logo.svg" /><span>Tech Media</span></section><form className="techme-login-card" onSubmit={submit}><div><p className="techme-eyebrow">WELCOME</p><h1>Work, close at hand.</h1><p>Sign in with your Tech Media identity.</p></div><label>Email<IonInput autocomplete="email" fill="outline" inputmode="email" name="email" onIonInput={(event) => setEmail(event.detail.value ?? "")} placeholder="you@techmedia.in" required type="email" value={email} /></label><label>Password<IonInput fill="outline" name="password" onIonInput={(event) => setPassword(event.detail.value ?? "")} placeholder="Your password" required type="password" value={password} /></label>{error ? <p className="techme-error">{error}</p> : null}<IonButton disabled={pending} expand="block" type="submit">{pending ? <IonSpinner name="crescent" /> : "Sign in"}</IonButton><p className="techme-secure">Securely connected to Tech Media</p></form></main></IonContent>;
}

function MobileDesk({ actorEmail, onTabChange, tab }: { actorEmail: string; onTabChange: (tab: MobileTab) => void; tab: MobileTab }) {
  const [threadOpen, setThreadOpen] = useState(false);
  const openMessages = () => onTabChange("chats");
  const content = tab === "home" ? <Home onOpenMessages={openMessages} /> : tab === "chats" ? <Chats actorEmail={actorEmail} onThreadChange={setThreadOpen} /> : <Calls />;
  return <IonContent fullscreen className="techme-surface"><main className={threadOpen ? "techme-desk is-thread-open" : "techme-desk"}><header className="techme-header"><div className="techme-brand"><img alt="" src="/logo/logo.svg" /><span>Tech Media</span></div><div className="techme-header-actions"><IonIcon icon={notificationsOutline} /><span className="techme-online" /><IonIcon icon={gridOutline} /></div></header>{content}<nav className="techme-tabbar" aria-label="Main navigation"><Tab icon={homeOutline} label="Home" active={tab === "home"} onClick={() => { setThreadOpen(false); onTabChange("home"); }} /><Tab icon={callOutline} label="Calls" active={tab === "calls"} onClick={() => { setThreadOpen(false); onTabChange("calls"); }} /><Tab icon={chatbubbleEllipsesOutline} label="Messages" active={tab === "chats"} onClick={() => { setThreadOpen(false); onTabChange("chats"); }} /></nav></main></IonContent>;
}

function Home({ onOpenMessages }: { onOpenMessages: () => void }) { return <section className="techme-page"><p className="techme-eyebrow">TODAY</p><h1>Welcome back.</h1><p className="techme-subtitle">Your work dashboard</p><div className="techme-grid"><Feature icon={personOutline} title="CRM" detail="Manage enquiries and follow-ups" /><Feature icon={chatbubbleEllipsesOutline} title="Messages" detail="Keep customer conversations moving" onClick={onOpenMessages} /><Feature icon={notificationsOutline} title="Inbox" detail="Review the latest notifications" /></div></section>; }
function Chats({ actorEmail, onThreadChange }: { actorEmail: string; onThreadChange: (value: boolean) => void }) { return <MobileMessenger actorEmail={actorEmail} onThreadChange={onThreadChange} />; }
function Calls() { return <section className="techme-page"><p className="techme-eyebrow">CALLS</p><h1>Call desk</h1><p className="techme-subtitle">Recent activity and customer calls will appear here.</p><Feature icon={callOutline} title="No recent calls" detail="Start from CRM or a customer conversation" /></section>; }
function Feature({ detail, icon, onClick, title }: { detail: string; icon: string; onClick?: () => void; title: string }) { const content = <><span><IonIcon icon={icon} /></span><div><h2>{title}</h2><p>{detail}</p></div></>; return onClick ? <button aria-label={`Open ${title}`} className="techme-feature techme-feature-action" onClick={onClick} type="button">{content}</button> : <article className="techme-feature">{content}</article>; }
function Tab({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) { return <button className={active ? "is-active" : ""} onClick={onClick} type="button"><IonIcon icon={icon} /><span>{label}</span></button>; }
function emailFromToken() { try { const token = getToken(); const payload = token?.split(".")[1]; return payload ? JSON.parse(atob(payload.replace(/-/gu, "+").replace(/_/gu, "/"))).email ?? "" : ""; } catch { return ""; } }
