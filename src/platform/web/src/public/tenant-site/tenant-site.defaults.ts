import type { TenantPublicPortal } from "../../modules/tenant-portal";

export const fallbackTenantPortal: TenantPublicPortal = {
  brandName: "Tech Media",
  configured: false,
  domain: "",
  eyebrow: "Computer hardware and LogicX software",
  features: [
    {
      description: "Wholesale supply for resellers, offices, institutions, and project needs.",
      label: "01",
      title: "Hardware wholesale"
    },
    {
      description: "Straightforward computer and accessory buying support for retail customers.",
      label: "02",
      title: "Technology retail"
    },
    {
      description: "Business software for enquiries, teams, stores, and future location networks.",
      label: "03",
      title: "LogicX software"
    }
  ],
  footerText: "Computer hardware, wholesale, retail, support, and LogicX business software.",
  headline: "Technology for the counter, office, store, and growing business.",
  loginPath: "/login",
  posts: [
    {
      description: "Choose computer specifications around real workload and support life.",
      href: "/blog",
      label: "Buying guide",
      title: "Practical hardware selection"
    },
    {
      description: "Prepare shared rules and local responsibility before adding stores.",
      href: "/security",
      label: "Store network",
      title: "Plan multi-store operations"
    },
    {
      description: "Start with customer enquiries and grow through deliberate business modules.",
      href: "/features",
      label: "LogicX",
      title: "A staged software foundation"
    }
  ],
  publicSiteUrl: null,
  slides: [
    {
      description: "Computers, components, peripherals, and configured business systems.",
      label: "Hardware",
      title: "Technology products for daily work"
    },
    {
      description: "Supply and support shaped for wholesale and retail buying needs.",
      label: "Trade",
      title: "Clear coordination from enquiry to delivery"
    },
    {
      description: "CRM now, with multi-store and tenant capabilities added in stages.",
      label: "LogicX",
      title: "Software that grows with the business"
    }
  ],
  summary:
    "TechMedia combines computer hardware, wholesale and retail service, and LogicX business software.",
  tenantCode: null,
  theme: "blue"
};
