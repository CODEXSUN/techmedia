import {
  ArrowRight,
  Boxes,
  Building,
  Cpu,
  Headphones,
  Laptop,
  PackageSearch,
  Store
} from "lucide-react";
import { TenantPageIntro } from "../blocks/tenant-page-intro";
import { TenantPortalCta } from "../blocks/tenant-portal-cta";
import { useTenantSite } from "../tenant-site.context";
import { TenantSiteTemplate } from "../templates/tenant-site.template";

export function TenantWorkspacePage() {
  return (
    <TenantSiteTemplate activePage="workspace" pageTitle="Computer hardware">
      <HardwarePageContent />
    </TenantSiteTemplate>
  );
}

function HardwarePageContent() {
  const { portal } = useTenantSite();

  return (
    <>
      <TenantPageIntro
        eyebrow="Computer hardware"
        title="Hardware supply for retail customers, resellers, offices, and projects."
        summary={`${portal.brandName} connects product sourcing, practical advice, order coordination, and support for everyday computer and business technology needs.`}
        actions={
          <a className="tenant-button tenant-button-primary" href={portal.loginPath}>
            Open application <ArrowRight />
          </a>
        }
      />
      <section className="tenant-section">
        <div className="tenant-section-heading">
          <span>Product areas</span>
          <h2>Useful technology without an overwhelming catalogue experience.</h2>
        </div>
        <div className="tenant-card-grid tenant-card-grid-three">
          <article className="tenant-card">
            <Laptop />
            <h3>Computers</h3>
            <p>
              Laptops, desktops, workstations, upgrades, and configured systems for home and
              business use.
            </p>
          </article>
          <article className="tenant-card">
            <Cpu />
            <h3>Components</h3>
            <p>
              Processors, memory, storage, cabinets, power supplies, networking, and essential
              replacement parts.
            </p>
          </article>
          <article className="tenant-card">
            <PackageSearch />
            <h3>Peripherals</h3>
            <p>
              Monitors, printers, keyboards, mice, power protection, accessories, and supporting
              equipment.
            </p>
          </article>
        </div>
      </section>
      <section className="tenant-section tenant-section-soft">
        <div className="tenant-split">
          <div>
            <span className="tenant-kicker">Wholesale and retail</span>
            <h2>Different buying needs, one dependable supply approach.</h2>
            <p>
              Retail customers need clear advice and the right product. Wholesale buyers need
              availability, repeatable ordering, pricing coordination, and delivery clarity.
              TechMedia is shaped around both.
            </p>
          </div>
          <div className="tenant-check-list">
            <span>
              <Store /> Retail product guidance
            </span>
            <span>
              <Boxes /> Wholesale and reseller supply
            </span>
            <span>
              <Building /> Office and institutional requirements
            </span>
            <span>
              <Headphones /> Setup and service coordination
            </span>
          </div>
        </div>
      </section>
      <TenantPortalCta
        title="Bring your hardware enquiries into one working system."
        summary="The current application includes CRM enquiry handling; product, stock, store, and order capabilities will grow as independently owned modules."
      />
    </>
  );
}
