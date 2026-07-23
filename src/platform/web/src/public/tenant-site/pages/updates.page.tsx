import { CheckCircle2, CircleDot, Clock3, Store } from "lucide-react";
import { TenantPageIntro } from "../blocks/tenant-page-intro";
import { TenantSiteTemplate } from "../templates/tenant-site.template";

export function TenantUpdatesPage() {
  return (
    <TenantSiteTemplate activePage="updates" pageTitle="Product direction">
      <TenantPageIntro
        eyebrow="Product direction"
        title="A staged path from CRM foundation to multi-store LogicX."
        summary="This page separates what is working now from what TechMedia intends to build next. Roadmap items are not presented as released features."
      />
      <section className="tenant-section">
        <div className="tenant-timeline">
          <article>
            <CheckCircle2 />
            <div>
              <span>Available now</span>
              <h3>Tenant foundation, roles, application control, and CRM enquiries</h3>
              <p>
                Admin-only application setup plus permission-aware assigned, created, and open
                enquiry workflows.
              </p>
            </div>
          </article>
          <article>
            <CircleDot />
            <div>
              <span>Next modules</span>
              <h3>Products, stock context, customers, quotations, orders, and service</h3>
              <p>
                Each capability will be introduced through its own module boundary and verified
                persistence flow.
              </p>
            </div>
          </article>
          <article>
            <Clock3 />
            <div>
              <span>Later stage</span>
              <h3>Multi-store operations and consolidated owner visibility</h3>
              <p>
                Location-aware access, stock, teams, activity, and reporting without weakening
                tenant isolation.
              </p>
            </div>
          </article>
          <article>
            <Store />
            <div>
              <span>Longer direction</span>
              <h3>Franchise-style business networks</h3>
              <p>
                Shared policies and product standards with controlled local operations and clear
                data ownership.
              </p>
            </div>
          </article>
        </div>
      </section>
    </TenantSiteTemplate>
  );
}
