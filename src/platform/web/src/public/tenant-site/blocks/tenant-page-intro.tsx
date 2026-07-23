import type { ReactNode } from "react";

export function TenantPageIntro({
  actions,
  eyebrow,
  summary,
  title
}: {
  actions?: ReactNode;
  eyebrow: string;
  summary: string;
  title: string;
}) {
  return (
    <section className="tenant-page-intro">
      <span className="tenant-kicker">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{summary}</p>
      {actions ? <div className="tenant-actions">{actions}</div> : null}
    </section>
  );
}
