import { Building2, Crown, Headphones } from "lucide-react";
import type { ReactNode } from "react";

type TechMediaAuthLayoutProps = {
  children: ReactNode;
  surface: "admin" | "sa" | "tenant";
  title: string;
};

export function TechMediaAuthLayout({ children, surface, title }: TechMediaAuthLayoutProps) {
  const Icon = surface === "sa" ? Crown : surface === "admin" ? Headphones : Building2;
  const description =
    surface === "tenant"
      ? "Access your workspace with your registered credentials."
      : "Use your admin email and password for this desk.";

  return (
    <main className="auth-page">
      <section className="auth-shell" aria-label={title}>
        <div className="auth-brand">
          <span className="auth-surface-mark" data-surface={surface}>
            <img
              className="auth-logo-image techmedia-auth-logo-light"
              src="/logo/logo.svg"
              alt=""
              aria-hidden="true"
            />
            <img
              className="auth-logo-image techmedia-auth-logo-dark"
              src="/logo/logo-dark.svg"
              alt=""
              aria-hidden="true"
            />
            <span className="auth-surface-badge">
              <Icon size={13} strokeWidth={2.25} />
            </span>
          </span>
          <strong>TechMedia</strong>
        </div>
        <div className={`auth-card-frame auth-card-frame-${surface}`}>
          <div className="auth-card">
            <header className="auth-card-header">
              <h1>Welcome</h1>
              <p>{description}</p>
            </header>
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}
