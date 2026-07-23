import {
  ArrowRight,
  Building2,
  Database,
  KeyRound,
  Network,
  ShieldCheck,
  Store,
  UsersRound
} from "lucide-react";
import { TenantPageIntro } from "../blocks/tenant-page-intro";
import { TenantPortalCta } from "../blocks/tenant-portal-cta";
import { useTenantSite } from "../tenant-site.context";
import { TenantSiteTemplate } from "../templates/tenant-site.template";

export function TenantSecurityPage() {
  return (
    <TenantSiteTemplate activePage="security" pageTitle="Stores and tenancy">
      <StoresPageContent />
    </TenantSiteTemplate>
  );
}

function StoresPageContent() {
  const { portal } = useTenantSite();

  return (
    <>
      <TenantPageIntro
        eyebrow="Stores, tenants, and access"
        title="A clean foundation for one store today and a controlled network tomorrow."
        summary={`${portal.brandName} is being prepared for isolated businesses, location-aware operations, and franchise-style growth without treating every user or store as the same.`}
        actions={
          <a className="tenant-button tenant-button-primary" href={portal.loginPath}>
            Open secure workspace <ArrowRight />
          </a>
        }
      />
      <section className="tenant-section">
        <div className="tenant-card-grid tenant-card-grid-three">
          <article className="tenant-card">
            <Building2 />
            <h3>Tenant separation</h3>
            <p>
              Each business keeps its own identity, database context, users, roles, and application
              configuration.
            </p>
          </article>
          <article className="tenant-card">
            <KeyRound />
            <h3>Role-aware access</h3>
            <p>
              Administrative setup stays protected while staff receive only the business tools their
              responsibilities require.
            </p>
          </article>
          <article className="tenant-card">
            <Database />
            <h3>Data boundaries</h3>
            <p>
              Tenant context remains explicit through authentication, APIs, persistence, jobs, and
              future integrations.
            </p>
          </article>
        </div>
      </section>
      <section className="tenant-section tenant-section-soft">
        <div className="tenant-split">
          <div>
            <span className="tenant-kicker">Multi-store direction</span>
            <h2>Central visibility with local responsibility.</h2>
            <p>
              The planned store model separates location-level activity while allowing authorised
              owners and head-office teams to understand the wider business.
            </p>
          </div>
          <div className="tenant-check-list">
            <span>
              <Store /> Store-specific teams and activity
            </span>
            <span>
              <UsersRound /> Owner, manager, and staff roles
            </span>
            <span>
              <Network /> Shared network standards
            </span>
            <span>
              <ShieldCheck /> Permission-aware cross-store visibility
            </span>
          </div>
        </div>
      </section>
      <TenantPortalCta
        title="Use the current secure foundation while the store model grows."
        summary="Application administration is restricted to the tenant admin; CRM access follows explicit enquiry permissions."
      />
    </>
  );
}
