import { IonApp, IonButton, IonContent, IonIcon, IonInput, IonSpinner } from "@ionic/react";
import {
  briefcaseOutline,
  callOutline,
  chatbubbleEllipsesOutline,
  cloudDownloadOutline,
  homeOutline,
  menuOutline,
  notificationsOutline,
  personOutline,
  refreshOutline
} from "ionicons/icons";
import { useEffect, useState } from "react";
import { getToken, login } from "../../../platform/web/src/shared/api/platform-api";
import { MobileMessenger } from "../messaging/MobileMessenger";
import { MobileCallCapture } from "../modules/calls/MobileCallCapture";
import { MobileMyJobs } from "../modules/crm/MobileMyJobs";
import {
  MobileReleaseUpdateDialog,
  type MobileReleaseUpdateState,
  useMobileReleaseUpdater
} from "../update/MobileReleaseUpdater";

type MobileTab = "calls" | "chats" | "home" | "jobs";

export function MobileApp({ authenticated }: { authenticated: boolean }) {
  const [signedIn, setSignedIn] = useState(authenticated);
  const [email, setEmail] = useState(() => emailFromToken());
  const [tab, setTab] = useState<MobileTab>("home");
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const updater = useMobileReleaseUpdater(signedIn);

  useEffect(() => {
    if (updater.availableRelease) setUpdateDialogOpen(true);
  }, [updater.availableRelease]);

  return (
    <IonApp>
      {signedIn ? (
        <MobileDesk
          actorEmail={email}
          onOpenUpdate={() => setUpdateDialogOpen(true)}
          onTabChange={setTab}
          tab={tab}
          updater={updater}
        />
      ) : (
        <MobileLogin
          onSignedIn={(value) => {
            setEmail(value);
            setSignedIn(true);
          }}
        />
      )}
      {signedIn ? (
        <MobileReleaseUpdateDialog
          onDismiss={() => setUpdateDialogOpen(false)}
          open={updateDialogOpen}
          release={updater.availableRelease}
        />
      ) : null}
    </IonApp>
  );
}

function MobileLogin({ onSignedIn }: { onSignedIn: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const result = await login({ email, password });
    setPending(false);
    if (result.success) onSignedIn(result.data.email);
    else setError(result.error.message);
  }

  return (
    <IonContent className="techme-surface" fullscreen>
      <main className="techme-login">
        <section className="techme-brand"><img alt="Tech Media" src="/logo/logo.svg" /><span>Tech Media</span></section>
        <form className="techme-login-card" onSubmit={submit}>
          <div><p className="techme-eyebrow">WELCOME</p><h1>Work, close at hand.</h1><p>Sign in with your Tech Media identity.</p></div>
          <label>Email<IonInput autocomplete="email" fill="outline" inputmode="email" name="email" onIonInput={(event) => setEmail(event.detail.value ?? "")} placeholder="you@techmedia.in" required type="email" value={email} /></label>
          <label>Password<IonInput fill="outline" name="password" onIonInput={(event) => setPassword(event.detail.value ?? "")} placeholder="Your password" required type="password" value={password} /></label>
          {error ? <p className="techme-error">{error}</p> : null}
          <IonButton disabled={pending} expand="block" type="submit">{pending ? <IonSpinner name="crescent" /> : "Sign in"}</IonButton>
          <p className="techme-secure">Securely connected to Tech Media</p>
        </form>
      </main>
    </IonContent>
  );
}

function MobileDesk({
  actorEmail,
  onOpenUpdate,
  onTabChange,
  tab,
  updater
}: {
  actorEmail: string;
  onOpenUpdate: () => void;
  onTabChange: (tab: MobileTab) => void;
  tab: MobileTab;
  updater: MobileReleaseUpdateState;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [threadOpen, setThreadOpen] = useState(false);
  const openMessages = () => onTabChange("chats");
  const content = tab === "home"
    ? <Home onOpenJobs={() => onTabChange("jobs")} onOpenMessages={openMessages} />
    : tab === "chats"
      ? <Chats actorEmail={actorEmail} onThreadChange={setThreadOpen} />
      : tab === "jobs" ? <MobileMyJobs /> : <Calls />;

  return (
    <IonContent className="techme-surface" fullscreen>
      <main className={threadOpen ? "techme-desk is-thread-open" : "techme-desk"}>
        <section className="techme-workspace">
          {!threadOpen ? <button aria-label="Open side menu" className="techme-side-menu-trigger" onClick={() => setMenuOpen(true)} type="button"><IonIcon icon={menuOutline} /></button> : null}
          {updater.availableRelease && !threadOpen ? <UpdateBanner onClick={onOpenUpdate} release={updater.availableRelease.versionName} /> : null}
          {content}
        </section>
        <nav aria-label="Main navigation" className="techme-tabbar">
          <Tab active={tab === "home"} icon={homeOutline} label="Home" onClick={() => changeTab("home")} />
          <Tab active={tab === "calls"} icon={callOutline} label="Calls" onClick={() => changeTab("calls")} />
          <Tab active={tab === "jobs"} icon={briefcaseOutline} label="My Jobs" onClick={() => changeTab("jobs")} />
          <Tab active={tab === "chats"} icon={chatbubbleEllipsesOutline} label="Messages" onClick={() => changeTab("chats")} />
        </nav>
        {menuOpen ? <SideMenu onClose={() => setMenuOpen(false)} onOpenUpdate={onOpenUpdate} updater={updater} /> : null}
      </main>
    </IonContent>
  );

  function changeTab(value: MobileTab) {
    setThreadOpen(false);
    onTabChange(value);
  }
}

function SideMenu({ onClose, onOpenUpdate, updater }: { onClose: () => void; onOpenUpdate: () => void; updater: MobileReleaseUpdateState }) {
  async function check() {
    await updater.checkForUpdate();
  }

  return (
    <div className="techme-side-menu-layer" role="presentation">
      <button aria-label="Close side menu" className="techme-side-menu-backdrop" onClick={onClose} type="button" />
      <aside aria-label="Application menu" className="techme-side-menu">
        <header><img alt="" src="/logo/logo.svg" /><div><strong>Tech Media</strong><small>Version {updater.installedVersion?.versionName ?? __APP_VERSION__}</small></div></header>
        {updater.availableRelease ? <button onClick={() => { onClose(); onOpenUpdate(); }} type="button"><IonIcon icon={cloudDownloadOutline} /><span><strong>Update available</strong><small>Install version {updater.availableRelease.versionName}</small></span></button> : null}
        <button disabled={updater.checking} onClick={() => void check()} type="button"><IonIcon icon={refreshOutline} /><span><strong>{updater.checking ? "Checking…" : "Check for updates"}</strong><small>{updater.status ?? "Look for the latest Android release"}</small></span></button>
      </aside>
    </div>
  );
}

function UpdateBanner({ onClick, release }: { onClick: () => void; release: string }) {
  return <button className="techme-update-banner" onClick={onClick} type="button"><IonIcon icon={cloudDownloadOutline} /><span><strong>TechMedia {release} is available</strong><small>Tap to download and install</small></span></button>;
}

function Home({ onOpenJobs, onOpenMessages }: { onOpenJobs: () => void; onOpenMessages: () => void }) {
  return <section className="techme-page"><p className="techme-eyebrow">TODAY</p><h1>Welcome back.</h1><p className="techme-subtitle">Your work dashboard</p><div className="techme-grid"><Feature detail="Assigned Frappe enquiries and follow-ups" icon={personOutline} onClick={onOpenJobs} title="My Jobs" /><Feature detail="Keep customer conversations moving" icon={chatbubbleEllipsesOutline} onClick={onOpenMessages} title="Messages" /><Feature detail="Review the latest notifications" icon={notificationsOutline} title="Inbox" /></div></section>;
}

function Chats({ actorEmail, onThreadChange }: { actorEmail: string; onThreadChange: (value: boolean) => void }) {
  return <MobileMessenger actorEmail={actorEmail} onThreadChange={onThreadChange} />;
}

function Calls() { return <MobileCallCapture />; }

function Feature({ detail, icon, onClick, title }: { detail: string; icon: string; onClick?: () => void; title: string }) {
  const content = <><span><IonIcon icon={icon} /></span><div><h2>{title}</h2><p>{detail}</p></div></>;
  return onClick ? <button aria-label={`Open ${title}`} className="techme-feature techme-feature-action" onClick={onClick} type="button">{content}</button> : <article className="techme-feature">{content}</article>;
}

function Tab({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) {
  return <button className={active ? "is-active" : ""} onClick={onClick} type="button"><IonIcon icon={icon} /><span>{label}</span></button>;
}

function emailFromToken() {
  try {
    const token = getToken();
    const payload = token?.split(".")[1];
    return payload ? JSON.parse(atob(payload.replace(/-/gu, "+").replace(/_/gu, "/"))).email ?? "" : "";
  } catch {
    return "";
  }
}
