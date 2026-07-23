import { Link } from "@tanstack/react-router";
import { ArrowRight, Boxes, CircleHelp, LogIn, MessageSquareText, Store } from "lucide-react";
import { TenantPageIntro } from "../blocks/tenant-page-intro";
import { useTenantSite } from "../tenant-site.context";
import { TenantSiteTemplate } from "../templates/tenant-site.template";

export function TenantContactPage() {
  return (
    <TenantSiteTemplate activePage="contact" pageTitle="Contact">
      <ContactPageContent />
    </TenantSiteTemplate>
  );
}

function ContactPageContent() {
  const { portal } = useTenantSite();

  return (
    <>
      <TenantPageIntro
        eyebrow="Contact TechMedia"
        title="Tell us what hardware, store, or software problem you are trying to solve."
        summary="A useful conversation starts with the products, locations, team responsibilities, and customer workflow involved—not a long feature checklist."
      />
      <section className="tenant-section">
        <div className="tenant-card-grid tenant-card-grid-three">
          <article className="tenant-card">
            <Boxes />
            <h3>Hardware enquiry</h3>
            <p>
              Share product category, specification, quantity, location, timing, and whether the
              requirement is retail or wholesale.
            </p>
          </article>
          <article className="tenant-card">
            <Store />
            <h3>Store requirement</h3>
            <p>
              Describe the current locations, counters, staff roles, stock flow, and visibility
              expected by the owner or head office.
            </p>
          </article>
          <article className="tenant-card">
            <MessageSquareText />
            <h3>LogicX discussion</h3>
            <p>
              Explain the customer, enquiry, follow-up, store, or operational workflow that needs a
              cleaner system.
            </p>
          </article>
        </div>
      </section>
      <section className="tenant-section tenant-section-soft">
        <div className="tenant-contact-actions">
          <article>
            <LogIn />
            <div>
              <h3>Existing application user</h3>
              <p>Continue with your registered business credentials.</p>
            </div>
            <a className="tenant-text-link" href={portal.loginPath}>
              Sign in <ArrowRight />
            </a>
          </article>
          <article>
            <CircleHelp />
            <div>
              <h3>Service availability</h3>
              <p>Check the current application health before reporting an access problem.</p>
            </div>
            <Link className="tenant-text-link" to="/status">
              View status <ArrowRight />
            </Link>
          </article>
        </div>
      </section>
    </>
  );
}
