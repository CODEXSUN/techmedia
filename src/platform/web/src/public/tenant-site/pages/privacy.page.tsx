import { TenantPageIntro } from "../blocks/tenant-page-intro";
import { TenantSiteTemplate } from "../templates/tenant-site.template";

export function TenantPrivacyPage() {
  return (
    <TenantSiteTemplate activePage="privacy" pageTitle="Privacy">
      <TenantPageIntro
        eyebrow="Privacy"
        title="Business information should stay inside the business context that owns it."
        summary="This public summary explains the privacy direction for TechMedia and LogicX. Final contractual terms may add region, service, and customer-specific detail."
      />
      <section className="tenant-section tenant-prose">
        <h2>Information we handle</h2>
        <p>
          Account, tenant, user, enquiry, store, product, operational, support, and technical
          information may be handled when the related feature is enabled and used.
        </p>
        <h2>Why it is used</h2>
        <p>
          Information is used to authenticate users, provide requested workflows, protect tenant
          boundaries, support the service, diagnose failures, and improve authorised product
          operation.
        </p>
        <h2>Tenant and store boundaries</h2>
        <p>
          Business data must remain scoped to its tenant. Future multi-store access will follow
          explicit roles and location permissions rather than making every store visible to every
          user.
        </p>
        <h2>Your responsibility</h2>
        <p>
          Use authorised accounts, protect credentials, assign access carefully, and avoid entering
          unnecessary sensitive information in general notes or support messages.
        </p>
        <h2>Questions</h2>
        <p>
          Use the TechMedia contact route for privacy or data-handling questions. Do not include
          passwords, one-time codes, or access tokens.
        </p>
      </section>
    </TenantSiteTemplate>
  );
}
