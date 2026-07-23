import { ArrowRight } from "lucide-react";
import { useTenantSite } from "../tenant-site.context";

export function TenantPortalCta({
  summary = "Sign in to continue with the TechMedia application workspace and available business tools.",
  title = "Ready to continue with TechMedia?"
}: {
  summary?: string;
  title?: string;
}) {
  const { portal } = useTenantSite();

  return (
    <section className="tenant-cta">
      <div>
        <span>TechMedia application</span>
        <h2>{title}</h2>
        <p>{summary}</p>
      </div>
      <a className="tenant-button tenant-button-primary" href={portal.loginPath}>
        Open application <ArrowRight />
      </a>
    </section>
  );
}
