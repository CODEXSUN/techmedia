import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useTenantSite } from "../tenant-site.context";
import type { TenantPublicPageKey } from "../tenant-site.types";

const navigation = [
  { key: "workspace", label: "Hardware", to: "/workspace" },
  { key: "features", label: "LogicX", to: "/features" },
  { key: "security", label: "Stores", to: "/security" },
  { key: "about", label: "About", to: "/about" },
  { key: "contact", label: "Contact", to: "/contact" }
] as const;

export function TenantSiteHeader({ activePage }: { activePage: TenantPublicPageKey }) {
  const { portal } = useTenantSite();

  return (
    <nav className="tenant-nav" aria-label="TechMedia navigation">
      <Link className="tenant-brand" to="/" aria-label={`${portal.brandName} home`}>
        <img className="tenant-brand-logo" src="/logo/logo.svg" alt="" aria-hidden="true" />
        <strong>{portal.brandName}</strong>
      </Link>
      <div className="tenant-menu">
        {navigation.map((item) => (
          <Link
            key={item.key}
            to={item.to}
            aria-current={activePage === item.key ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <a className="tenant-nav-login" href={portal.loginPath}>
        Sign in <ArrowRight />
      </a>
    </nav>
  );
}
