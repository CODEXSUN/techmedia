import { lazy, Suspense, useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  CircleGaugeIcon,
  MessagesSquareIcon,
  PlugZapIcon,
  Settings2Icon,
  ShieldCheckIcon,
  UserRoundPlusIcon
} from "lucide-react";
import { GlobalLoader } from "@codexsun/ui/components/global-loader";
import { ApplicationLayout } from "@codexsun/ui/layouts/application-layout";
import type { SidemenuItem } from "@codexsun/ui/blocks/menu/sidemenu/sub/sidemenu-section";
import { AuthGate } from "../../shared/auth/AuthGate";
import { getToken, logout } from "../../shared/api/platform-api";
import {
  applicationEntryPath,
  canAccessAdministratorSettings,
  canSelectApplicationTheme
} from "./app-shell-access";

const UserWorkspace = lazy(() =>
  import("../../modules/user").then((module) => ({ default: module.UserWorkspace }))
);
const RoleWorkspace = lazy(() =>
  import("../../modules/role").then((module) => ({ default: module.RoleWorkspace }))
);
const PermissionWorkspace = lazy(() =>
  import("../../modules/permission").then((module) => ({ default: module.PermissionWorkspace }))
);
const UserRoleWorkspace = lazy(() =>
  import("../../modules/user-role").then((module) => ({ default: module.UserRoleWorkspace }))
);
const RolePermissionWorkspace = lazy(() =>
  import("../../modules/role-permission").then((module) => ({
    default: module.RolePermissionWorkspace
  }))
);
const UserProfileWorkspace = lazy(() =>
  import("../../modules/user/user.profile.workspace").then((module) => ({
    default: module.UserProfileWorkspace
  }))
);
const CrmOverview = lazy(() =>
  import("../../modules/crm").then((module) => ({ default: module.CrmOverview }))
);
const CrmWorkspace = lazy(() =>
  import("../../modules/crm").then((module) => ({ default: module.CrmWorkspace }))
);
const EstimateWorkspace = lazy(() =>
  import("../../modules/estimate").then((module) => ({ default: module.EstimateWorkspace }))
);
const FrappeOverview = lazy(() =>
  import("../../modules/frappe").then((module) => ({ default: module.FrappeOverview }))
);
const FrappeUserSyncWorkspace = lazy(() =>
  import("../../modules/frappe").then((module) => ({ default: module.FrappeUserSyncWorkspace }))
);

type Page =
  | "identity.users"
  | "identity.roles"
  | "identity.permissions"
  | "identity.user-roles"
  | "identity.role-permissions"
  | "identity.profile"
  | "settings.frappe.overview"
  | "settings.frappe.users"
  | "crm.overview"
  | "crm.assigned"
  | "crm.created"
  | "crm.open"
  | "estimate.list";

type Claims = {
  email: string;
  name?: string;
  permissions?: string[];
  role?: string;
};

export function AppDesk() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const claims = readClaims();
  const permissions = claims.permissions ?? [];
  const administrator = canAccessAdministratorSettings(claims.role);
  const requestedPage = pageFromPath(pathname, claims.role);
  const page = accessiblePage(requestedPage, administrator);
  const select = (next: Page) => void navigate({ to: `/app/${next.replaceAll(".", "/")}` });
  const menuItems = buildMenu(page, select, administrator);

  useEffect(() => {
    if (page !== requestedPage) {
      void navigate({ replace: true, to: `/app/${page.replaceAll(".", "/")}` });
    }
  }, [navigate, page, requestedPage]);

  async function handleLogout() {
    await logout();
    await navigate({ to: "/login" });
  }

  return (
    <AuthGate>
      <ApplicationLayout
        brand={{ subtitle: "single-client workspace", title: "TechMedia" }}
        headerTitle={titleFor(page)}
        menuItems={menuItems}
        onLogout={handleLogout}
        profileHref="/app/identity/profile"
        showHomeAction={false}
        showSidebarUser={false}
        showThemeAction={canSelectApplicationTheme(claims.role)}
        subtitle={null}
        title={null}
        user={{
          email: claims.email,
          fallback: initials(claims.name ?? claims.email),
          name: claims.name ?? claims.email
        }}
        versionLabel={`v ${__APP_VERSION__}`}
        workspaceItems={[
          {
            active: page.startsWith("crm.") || page.startsWith("estimate."),
            description: "Live Frappe enquiry and estimate workflows.",
            icon: MessagesSquareIcon,
            title: "CRM",
            url: "/app/crm/overview"
          },
          ...(administrator
            ? [
                {
                  active: page.startsWith("identity.") || page.startsWith("settings."),
                  description: "Identity, Frappe connection, and user credentials.",
                  icon: PlugZapIcon,
                  title: "Application",
                  url: "/app/settings/frappe/overview"
                }
              ]
            : [])
        ]}
      >
        <main className="mx-auto w-[calc(100%-2rem)] max-w-[92rem] space-y-5 py-4 lg:w-[calc(100%-3rem)] lg:py-5">
          <Suspense fallback={<GlobalLoader />}>
            {renderPage(page, claims, permissions, administrator)}
          </Suspense>
        </main>
      </ApplicationLayout>
    </AuthGate>
  );
}

function renderPage(
  page: Page,
  claims: Claims,
  permissions: string[],
  administrator: boolean
) {
  if (isAdministratorPage(page) && !administrator) {
    return (
      <CrmOverview signedInUser={{ email: claims.email, name: claims.name ?? claims.email }} />
    );
  }
  if (page === "identity.users") return <UserWorkspace actorEmail={claims.email} />;
  if (page === "identity.roles") return <RoleWorkspace />;
  if (page === "identity.permissions") return <PermissionWorkspace />;
  if (page === "identity.user-roles") return <UserRoleWorkspace />;
  if (page === "identity.role-permissions") return <RolePermissionWorkspace />;
  if (page === "identity.profile") return <UserProfileWorkspace />;
  if (page === "settings.frappe.overview") {
    return <FrappeOverview canUpdate={permissions.includes("settings.frappe.update")} />;
  }
  if (page === "settings.frappe.users") {
    return (
      <FrappeUserSyncWorkspace
        canImport={
          permissions.includes("settings.frappe.update") &&
          permissions.includes("identity.user.create")
        }
      />
    );
  }
  if (page === "crm.overview") {
    return (
      <CrmOverview signedInUser={{ email: claims.email, name: claims.name ?? claims.email }} />
    );
  }
  if (page === "estimate.list") {
    return (
      <EstimateWorkspace
        canCreate={
          permissions.includes("estimate.create") || permissions.includes("crm.enquiry.create")
        }
        canUpdate={
          permissions.includes("estimate.update") || permissions.includes("crm.enquiry.update")
        }
      />
    );
  }
  const view = page === "crm.created" ? "created" : page === "crm.open" ? "open" : "assigned";
  return (
    <CrmWorkspace
      canAssign={permissions.includes("crm.enquiry.assign")}
      canCreate={permissions.includes("crm.enquiry.create")}
      canCreateEstimate={
        permissions.includes("estimate.create") || permissions.includes("crm.enquiry.create")
      }
      canCreateQuotation={
        permissions.includes("quotation.create") || permissions.includes("crm.enquiry.create")
      }
      canForceDelete={permissions.includes("crm.enquiry.force-delete")}
      canSuspend={false}
      canUpdate={permissions.includes("crm.enquiry.update")}
      canUpdateEstimate={
        permissions.includes("estimate.update") || permissions.includes("crm.enquiry.update")
      }
      canUpdateQuotation={
        permissions.includes("quotation.update") || permissions.includes("crm.enquiry.update")
      }
      view={view}
    />
  );
}

function buildMenu(
  page: Page,
  select: (page: Page) => void,
  administrator: boolean
): SidemenuItem[] {
  const item = (title: string, target: Page) => ({
    isActive: page === target,
    onSelect: () => select(target),
    title
  });
  if (!administrator || page.startsWith("crm.") || page.startsWith("estimate.")) {
    return [
      {
        icon: MessagesSquareIcon,
        isActive: true,
        items: [
          { ...item("Overview", "crm.overview"), icon: CircleGaugeIcon },
          item("My Enquiry", "crm.assigned"),
          item("Enquiry created by me", "crm.created"),
          item("Open Enquiry", "crm.open")
        ],
        title: "CRM"
      }
    ];
  }
  return [
    {
      icon: ShieldCheckIcon,
      isActive: page.startsWith("identity."),
      items: [
        item("Users", "identity.users"),
        item("Roles", "identity.roles"),
        item("Permissions", "identity.permissions"),
        item("User Roles", "identity.user-roles"),
        item("Role Permissions", "identity.role-permissions")
      ],
      title: "Identity"
    },
    ...(administrator
      ? [
          {
            icon: Settings2Icon,
            isActive: page.startsWith("settings."),
            items: [
              {
                ...item("Frappe connection", "settings.frappe.overview"),
                icon: CircleGaugeIcon
              },
              { ...item("Frappe Users", "settings.frappe.users"), icon: UserRoundPlusIcon }
            ],
            title: "Settings"
          }
        ]
      : [])
  ];
}

function accessiblePage(page: Page, administrator: boolean): Page {
  return isAdministratorPage(page) && !administrator ? "crm.overview" : page;
}

function isAdministratorPage(page: Page) {
  return page.startsWith("settings.") || (page.startsWith("identity.") && page !== "identity.profile");
}

function pageFromPath(pathname: string, role: string | undefined): Page {
  const value = pathname.replace(/^\/app\/?/u, "").replaceAll("/", ".");
  const allowed: Page[] = [
    "identity.users",
    "identity.roles",
    "identity.permissions",
    "identity.user-roles",
    "identity.role-permissions",
    "identity.profile",
    "settings.frappe.overview",
    "settings.frappe.users",
    "crm.overview",
    "crm.assigned",
    "crm.created",
    "crm.open",
    "estimate.list"
  ];
  if (allowed.includes(value as Page)) return value as Page;
  return applicationEntryPath(role)
    .replace(/^\/app\//u, "")
    .replaceAll("/", ".") as Page;
}

function titleFor(page: Page) {
  const labels: Partial<Record<Page, string>> = {
    "crm.assigned": "My Enquiry",
    "crm.created": "Enquiry created by me",
    "crm.open": "Open Enquiry",
    "estimate.list": "Estimate",
    "settings.frappe.overview": "Frappe connection",
    "settings.frappe.users": "Frappe Users"
  };
  if (labels[page]) return labels[page];
  return page
    .split(".")
    .at(-1)!
    .split("-")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function readClaims(): Claims {
  const token = getToken();
  if (!token) return { email: "" };
  try {
    const encoded = token.split(".")[1] ?? "";
    return JSON.parse(atob(encoded.replace(/-/g, "+").replace(/_/g, "/"))) as Claims;
  } catch {
    return { email: "" };
  }
}

function initials(value: string) {
  return value
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
