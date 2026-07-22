import { Link } from "@tanstack/react-router";
import { ExternalLink, Sparkles } from "lucide-react";
import { useTenantSite } from "../tenant-site.context";

export function TenantSiteFooter() {
  const { portal } = useTenantSite();

  return (
    <footer className="tenant-portal-footer">
      <div className="tenant-portal-footer-brand">
        <div>
          <span className="tenant-portal-mark" aria-hidden="true">
            <Sparkles />
          </span>
          <strong>{portal.brandName}</strong>
        </div>
        <p>
          Operations, accounts, compliance documents, staff controls, and daily follow-up in one
          clear business flow.
        </p>
        {portal.domain ? <small>{portal.domain}</small> : null}
      </div>
      <div className="tenant-portal-footer-links">
        <section>
          <strong>Product</strong>
          <Link to="/workspace">Operations overview</Link>
          <Link to="/features">Features</Link>
          <Link to="/security">Security</Link>
          <Link to="/updates">Updates</Link>
          <a href={portal.loginPath}>Sign in</a>
        </section>
        <section>
          <strong>Company</strong>
          <Link to="/about">About</Link>
          <Link to="/blog">Blog</Link>
          <Link to="/contact">Contact</Link>
          {portal.publicSiteUrl ? (
            <a href={portal.publicSiteUrl}>
              Public site <ExternalLink />
            </a>
          ) : null}
        </section>
        <section>
          <strong>Application</strong>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/status">Platform status</Link>
        </section>
      </div>
      <div className="tenant-portal-footer-bottom">
        <span>Operations and accounts application</span>
        <span>
          Â© {new Date().getFullYear()} {portal.brandName}
        </span>
      </div>
    </footer>
  );
}
