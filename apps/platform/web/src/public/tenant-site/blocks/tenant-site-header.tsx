import { Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink, Sparkles } from "lucide-react";
import { useTenantSite } from "../tenant-site.context";
import type { TenantPublicPageKey } from "../tenant-site.types";

export function TenantSiteHeader({ activePage }: { activePage: TenantPublicPageKey }) {
  const { portal } = useTenantSite();

  return (
    <nav className="tenant-portal-nav" aria-label="Operations product navigation">
      <Link className="tenant-portal-brand" to="/" aria-label={`${portal.brandName} home`}>
        <span className="tenant-portal-mark" aria-hidden="true">
          <Sparkles />
        </span>
        <span>
          <strong>{portal.brandName}</strong>
          <small>Operations &amp; Accounts</small>
        </span>
      </Link>
      <div className="tenant-portal-menu">
        <Link to="/workspace" aria-current={activePage === "workspace" ? "page" : undefined}>
          Operations
        </Link>
        <Link to="/features" aria-current={activePage === "features" ? "page" : undefined}>
          Features
        </Link>
        <Link to="/security" aria-current={activePage === "security" ? "page" : undefined}>
          Security
        </Link>
        <Link to="/blog" aria-current={activePage === "blog" ? "page" : undefined}>
          Blog
        </Link>
        <Link to="/updates" aria-current={activePage === "updates" ? "page" : undefined}>
          Updates
        </Link>
        {portal.publicSiteUrl ? (
          <a href={portal.publicSiteUrl}>
            Public site <ExternalLink />
          </a>
        ) : null}
      </div>
      <a className="tenant-portal-login" href={portal.loginPath}>
        Open application <ArrowRight />
      </a>
    </nav>
  );
}
