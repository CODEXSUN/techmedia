import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Boxes,
  Building2,
  Laptop,
  MonitorSmartphone,
  Network,
  PackageCheck,
  ShoppingCart,
  Store,
  Wrench
} from "lucide-react";
import { TenantPortalCta } from "./tenant-site/blocks/tenant-portal-cta";
import { useTenantSite } from "./tenant-site/tenant-site.context";
import { TenantSiteTemplate } from "./tenant-site/templates/tenant-site.template";

export function TenantHome() {
  return (
    <TenantSiteTemplate activePage="home">
      <HomeContent />
    </TenantSiteTemplate>
  );
}

function HomeContent() {
  const { portal } = useTenantSite();

  return (
    <>
      <section className="tenant-hero">
        <div>
          <span className="tenant-kicker">Computer hardware · wholesale · retail</span>
          <h1>Technology for the counter, office, store, and growing business.</h1>
          <p>
            {portal.brandName} brings dependable computer hardware, practical retail support, and
            LogicX business software together in one clear technology company.
          </p>
          <div className="tenant-actions">
            <Link className="tenant-button tenant-button-primary" to="/workspace">
              Explore hardware <ArrowRight />
            </Link>
            <Link className="tenant-button tenant-button-secondary" to="/features">
              Discover LogicX
            </Link>
          </div>
        </div>
        <div className="tenant-hero-panel" aria-label="TechMedia business areas">
          <article>
            <Laptop />
            <span>Hardware</span>
            <strong>Laptops, desktops, components, peripherals, and business systems</strong>
          </article>
          <article>
            <Store />
            <span>Trade</span>
            <strong>Wholesale supply and straightforward retail service</strong>
          </article>
          <article>
            <MonitorSmartphone />
            <span>LogicX</span>
            <strong>Software for enquiries, stores, stock, customers, and daily operations</strong>
          </article>
        </div>
      </section>

      <section className="tenant-section">
        <div className="tenant-section-heading">
          <span>What we do</span>
          <h2>One technology partner for products, supply, service, and software.</h2>
        </div>
        <div className="tenant-card-grid tenant-card-grid-three">
          <article className="tenant-card">
            <Boxes />
            <h3>Wholesale hardware</h3>
            <p>
              Practical sourcing for resellers, offices, institutions, stores, and project
              requirements with clear product and order coordination.
            </p>
          </article>
          <article className="tenant-card">
            <ShoppingCart />
            <h3>Retail technology</h3>
            <p>
              Computers, accessories, upgrades, and informed buying support for homes and businesses
              without unnecessary complexity.
            </p>
          </article>
          <article className="tenant-card">
            <Wrench />
            <h3>Setup and support</h3>
            <p>
              Product selection, installation planning, store and office setup, and dependable
              after-sales coordination.
            </p>
          </article>
        </div>
      </section>

      <section className="tenant-section tenant-section-soft">
        <div className="tenant-split">
          <div>
            <span className="tenant-kicker">LogicX software</span>
            <h2>
              Simple software for businesses that sell, serve, and grow through many locations.
            </h2>
            <p>
              LogicX is the software direction of TechMedia. It starts with CRM and operational
              tools, then grows toward tenant-isolated, multi-store management for wholesalers,
              retailers, and franchise-style networks.
            </p>
            <Link className="tenant-text-link" to="/features">
              See the LogicX direction <ArrowRight />
            </Link>
          </div>
          <div className="tenant-check-list">
            <span>
              <Building2 /> Separate business and tenant context
            </span>
            <span>
              <Store /> Store and branch visibility
            </span>
            <span>
              <Network /> Roles for owners, managers, and staff
            </span>
            <span>
              <PackageCheck /> Product, enquiry, stock, and service workflows
            </span>
          </div>
        </div>
      </section>

      <section className="tenant-section">
        <div className="tenant-section-heading">
          <span>Built to expand</span>
          <h2>Start with one business. Prepare for many stores and franchise locations.</h2>
        </div>
        <div className="tenant-step-grid">
          <article>
            <span>01</span>
            <h3>Single store</h3>
            <p>Clear daily work for one retail or wholesale operation.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Multi-store</h3>
            <p>Shared visibility with location-specific staff and operations.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Tenant network</h3>
            <p>Isolated businesses running on the same product foundation.</p>
          </article>
          <article>
            <span>04</span>
            <h3>Franchise model</h3>
            <p>Consistent controls with room for local ownership and execution.</p>
          </article>
        </div>
        <p className="tenant-roadmap-note">
          Multi-store and franchise capabilities describe the product direction and will be added in
          stages; the current application foundation is not presented as a finished franchise
          management suite.
        </p>
      </section>

      <TenantPortalCta />
    </>
  );
}
