import {
  ArrowRight,
  Boxes,
  Building2,
  CalendarClock,
  Contact,
  Network,
  ShieldCheck,
  Store,
  UsersRound
} from "lucide-react";
import { TenantPageIntro } from "../blocks/tenant-page-intro";
import { TenantPortalCta } from "../blocks/tenant-portal-cta";
import { useTenantSite } from "../tenant-site.context";
import { TenantSiteTemplate } from "../templates/tenant-site.template";

export function TenantFeaturesPage() {
  return (
    <TenantSiteTemplate activePage="features" pageTitle="LogicX software">
      <LogicXPageContent />
    </TenantSiteTemplate>
  );
}

function LogicXPageContent() {
  const { portal } = useTenantSite();

  return (
    <>
      <TenantPageIntro
        eyebrow="LogicX by TechMedia"
        title="Business software that starts simple and grows with every store."
        summary={`LogicX is ${portal.brandName}'s software direction for customer enquiries, team responsibility, store operations, and eventually multi-tenant, multi-location business networks.`}
        actions={
          <a className="tenant-button tenant-button-primary" href={portal.loginPath}>
            Open LogicX foundation <ArrowRight />
          </a>
        }
      />
      <section className="tenant-section">
        <div className="tenant-section-heading">
          <span>Available foundation</span>
          <h2>Start with clear customer follow-up and controlled access.</h2>
        </div>
        <div className="tenant-card-grid tenant-card-grid-three">
          <article className="tenant-card">
            <Contact />
            <h3>CRM enquiries</h3>
            <p>
              Capture titled enquiries, priorities, status, assigned users, notes, and scheduled
              follow-ups.
            </p>
          </article>
          <article className="tenant-card">
            <UsersRound />
            <h3>User responsibility</h3>
            <p>
              Give owners, managers, staff, and users the application access appropriate to their
              work.
            </p>
          </article>
          <article className="tenant-card">
            <CalendarClock />
            <h3>Follow-up workspace</h3>
            <p>Keep assigned, created, and open enquiries visible with dates and working notes.</p>
          </article>
        </div>
      </section>
      <section className="tenant-section tenant-section-soft">
        <div className="tenant-section-heading">
          <span>Product direction</span>
          <h2>Designed to become a multi-store operating layer.</h2>
        </div>
        <div className="tenant-card-grid tenant-card-grid-four">
          <article className="tenant-card">
            <Store />
            <h3>Stores</h3>
            <p>Location-specific work, staff, counters, and daily visibility.</p>
          </article>
          <article className="tenant-card">
            <Boxes />
            <h3>Products and stock</h3>
            <p>Hardware catalogues, availability, movement, and reorder context.</p>
          </article>
          <article className="tenant-card">
            <Building2 />
            <h3>Tenants</h3>
            <p>Isolated business identity, data, users, permissions, and configuration.</p>
          </article>
          <article className="tenant-card">
            <Network />
            <h3>Franchise networks</h3>
            <p>Shared standards with controlled local execution across locations.</p>
          </article>
        </div>
        <p className="tenant-roadmap-note">
          <ShieldCheck /> These are staged product goals. Current screens expose only capabilities
          that are already implemented.
        </p>
      </section>
      <TenantPortalCta
        title="Start with CRM. Add business modules deliberately."
        summary="LogicX will grow through module-owned capabilities so stores and tenants can expand without mixing their data or responsibilities."
      />
    </>
  );
}
