import { ArrowRight, Boxes, Laptop, Network, Store } from "lucide-react";
import { TenantPageIntro } from "../blocks/tenant-page-intro";
import { TenantSiteTemplate } from "../templates/tenant-site.template";

const notes = [
  {
    icon: Laptop,
    label: "Buying guide",
    title: "Choose business computers around workload, support, and upgrade life",
    text: "A practical specification is easier to maintain than a machine selected only from a headline number."
  },
  {
    icon: Boxes,
    label: "Wholesale",
    title: "Make repeat hardware orders easier to review",
    text: "Keep product identity, quantity, substitution rules, delivery location, and responsible contact clear."
  },
  {
    icon: Store,
    label: "Retail",
    title: "Connect customer enquiries with the next store action",
    text: "Record the need, owner, priority, follow-up date, and outcome instead of relying on memory."
  },
  {
    icon: Network,
    label: "Store networks",
    title: "Prepare operating rules before adding locations",
    text: "Decide what is shared, what stays local, and which roles can see activity across stores."
  }
] as const;

export function TenantBlogPage() {
  return (
    <TenantSiteTemplate activePage="blog" pageTitle="Notes">
      <TenantPageIntro
        eyebrow="TechMedia notes"
        title="Simple guidance for hardware, stores, and business software."
        summary="Short, practical ideas drawn from computer trade, customer follow-up, and the work of preparing a business for more locations."
      />
      <section className="tenant-section">
        <div className="tenant-card-grid tenant-card-grid-two">
          {notes.map(({ icon: Icon, label, text, title }) => (
            <article className="tenant-card" key={title}>
              <Icon />
              <span className="tenant-card-label">{label}</span>
              <h3>{title}</h3>
              <p>{text}</p>
              <span className="tenant-text-link">
                Article publishing coming later <ArrowRight />
              </span>
            </article>
          ))}
        </div>
      </section>
    </TenantSiteTemplate>
  );
}
