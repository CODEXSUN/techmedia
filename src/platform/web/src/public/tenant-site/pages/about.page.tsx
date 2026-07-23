import { ArrowRight, Boxes, Code2, HeartHandshake, Store } from "lucide-react";
import { TenantPageIntro } from "../blocks/tenant-page-intro";
import { TenantPortalCta } from "../blocks/tenant-portal-cta";
import { useTenantSite } from "../tenant-site.context";
import { TenantSiteTemplate } from "../templates/tenant-site.template";

export function TenantAboutPage() {
  return (
    <TenantSiteTemplate activePage="about" pageTitle="About">
      <AboutPageContent />
    </TenantSiteTemplate>
  );
}

function AboutPageContent() {
  const { portal } = useTenantSite();

  return (
    <>
      <TenantPageIntro
        eyebrow={`About ${portal.brandName}`}
        title="A computer technology company with hardware roots and a software future."
        summary="TechMedia serves wholesale and retail technology needs while building LogicX: practical business software for customer work, stores, teams, and growing business networks."
        actions={
          <a className="tenant-button tenant-button-primary" href={portal.loginPath}>
            Open application <ArrowRight />
          </a>
        }
      />
      <section className="tenant-section">
        <div className="tenant-card-grid tenant-card-grid-three">
          <article className="tenant-card">
            <Boxes />
            <h3>Hardware knowledge</h3>
            <p>
              Understand the products, compatibility, supply realities, and support expectations
              behind a technology purchase.
            </p>
          </article>
          <article className="tenant-card">
            <Store />
            <h3>Trade experience</h3>
            <p>
              Support both retail conversations and wholesale relationships with clear, practical
              coordination.
            </p>
          </article>
          <article className="tenant-card">
            <Code2 />
            <h3>LogicX software</h3>
            <p>
              Turn what we learn from real business operations into focused, maintainable software
              modules.
            </p>
          </article>
        </div>
      </section>
      <section className="tenant-section tenant-section-soft">
        <div className="tenant-split">
          <div>
            <span className="tenant-kicker">Our approach</span>
            <h2>Useful first. Expandable by design.</h2>
            <p>
              We prefer software and service that solves the next real problem clearly. New store,
              stock, sales, support, and franchise capabilities will be introduced in stages with
              tenant and permission boundaries kept intact.
            </p>
          </div>
          <div className="tenant-quote">
            <HeartHandshake />
            <blockquote>
              Technology should make a business easier to run, easier to understand, and easier to
              grow.
            </blockquote>
          </div>
        </div>
      </section>
      <TenantPortalCta />
    </>
  );
}
