import { Link } from "@tanstack/react-router";
import { useTenantSite } from "../tenant-site.context";

export function TenantSiteFooter() {
  const { portal } = useTenantSite();

  return (
    <footer className="tenant-footer">
      <div className="tenant-footer-brand">
        <img className="tenant-brand-logo" src="/logo/logo-dark.svg" alt="" aria-hidden="true" />
        <div>
          <strong>{portal.brandName}</strong>
          <p>Computer hardware, wholesale, retail, support, and LogicX business software.</p>
        </div>
      </div>
      <div className="tenant-footer-links">
        <Link to="/workspace">Hardware</Link>
        <Link to="/features">LogicX</Link>
        <Link to="/security">Stores</Link>
        <Link to="/about">About</Link>
        <Link to="/contact">Contact</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
      </div>
      <div className="tenant-footer-bottom">
        <span>{portal.domain || "Technology for business"}</span>
        <span>
          © {new Date().getFullYear()} {portal.brandName}
        </span>
      </div>
    </footer>
  );
}
