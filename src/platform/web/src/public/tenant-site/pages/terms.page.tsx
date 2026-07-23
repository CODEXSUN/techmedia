import { TenantPageIntro } from "../blocks/tenant-page-intro";
import { TenantSiteTemplate } from "../templates/tenant-site.template";

export function TenantTermsPage() {
  return (
    <TenantSiteTemplate activePage="terms" pageTitle="Terms">
      <TenantPageIntro
        eyebrow="Terms of use"
        title="Use TechMedia and LogicX only for authorised business activity."
        summary="These are concise public-use principles. Commercial agreements, quotations, warranties, service terms, and tenant contracts may contain additional conditions."
      />
      <section className="tenant-section tenant-prose">
        <h2>Accounts and access</h2>
        <p>
          Users must use their own authorised account and must not bypass role, tenant, store, or
          application restrictions.
        </p>
        <h2>Hardware and services</h2>
        <p>
          Product specification, availability, price, delivery, warranty, installation, and support
          obligations are governed by the applicable quotation, invoice, manufacturer terms, or
          service agreement.
        </p>
        <h2>Software use</h2>
        <p>
          Do not misuse the service, interfere with other tenants, probe restricted systems, upload
          harmful content, or use automation outside an approved integration.
        </p>
        <h2>Business records</h2>
        <p>
          Customers remain responsible for the accuracy, legality, retention, and authorised use of
          the business information entered by their users.
        </p>
        <h2>Roadmap statements</h2>
        <p>
          Descriptions of planned multi-store, inventory, or franchise capabilities express product
          direction and do not guarantee a release date or final implementation.
        </p>
      </section>
    </TenantSiteTemplate>
  );
}
