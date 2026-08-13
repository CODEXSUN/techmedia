import { Fragment, lazy, Suspense, useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CircleGaugeIcon,
  BotIcon,
  MessagesSquareIcon,
  PlugZapIcon,
  ShoppingBagIcon,
  Settings2Icon,
  ShieldCheckIcon,
  UserRoundIcon,
  UserRoundPlusIcon
} from "lucide-react";
import { GlobalLoader } from "@codexsun/ui/components/global-loader";
import { ApplicationLayout } from "@codexsun/ui/layouts/application-layout";
import type { SidemenuItem } from "@codexsun/ui/blocks/menu/sidemenu/sub/sidemenu-section";
import { AuthGate } from "../../shared/auth/AuthGate";
import { getToken } from "../../shared/api/platform-api";
import {
  crmInAppNotificationEvent,
  showCrmDesktopNotification,
  useBrowserNotificationPermission,
  useCrmCallNotificationPreference,
  useCrmOverviewQuery,
  type CrmEnquiryOverview,
  type CrmInAppNotification
} from "../../modules/crm";
import { markNotificationRead, useNotificationInboxQuery } from "../../modules/notification";
import { applicationEntryPath, canAccessAdministratorSettings } from "./app-shell-access";
import { getHoneyAvailability, TemaMascot } from "../../modules/honey";

const UserWorkspace = lazy(() =>
  import("../../modules/user").then((module) => ({ default: module.UserWorkspace }))
);
const RoleWorkspace = lazy(() =>
  import("../../modules/role").then((module) => ({ default: module.RoleWorkspace }))
);
const PermissionWorkspace = lazy(() =>
  import("../../modules/permission").then((module) => ({ default: module.PermissionWorkspace }))
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
const CrmReports = lazy(() =>
  import("../../modules/crm").then((module) => ({ default: module.CrmReports }))
);
const CrmNotificationSettings = lazy(() =>
  import("../../modules/crm").then((module) => ({ default: module.CrmNotificationSettings }))
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
const HoneyWorkspace = lazy(() =>
  import("../../modules/honey").then((module) => ({ default: module.HoneyWorkspace }))
);
const AgentConnectorWorkspace = lazy(() =>
  import("../../modules/honey").then((module) => ({ default: module.AgentConnectorWorkspace }))
);
const SkillLibraryWorkspace = lazy(() =>
  import("../../modules/honey").then((module) => ({ default: module.SkillLibraryWorkspace }))
);
const IshopWorkspace = lazy(() =>
  import("../../modules/ishop").then((module) => ({ default: module.IshopWorkspace }))
);

type Page =
  | "identity.users"
  | "identity.roles"
  | "identity.permissions"
  | "identity.access"
  | "identity.profile"
  | "settings.frappe.overview"
  | "settings.frappe.users"
  | "settings.notifications"
  | "crm.overview"
  | "crm.assigned"
  | "crm.created"
  | "crm.open"
  | "crm.reports"
  | "estimate.list"
  | "ai.honey"
  | "ai.connector"
  | "ai.skills"
  | "ishop.catalogs"
  | "ishop.categories"
  | "ishop.brands"
  | "ishop.products"
  | "ishop.items"
  | "ishop.variants"
  | "ishop.images";

type Claims = {
  email: string;
  frappeUser?: string;
  name?: string;
  permissions?: string[];
  role?: string;
};

type AppNotification = CrmInAppNotification;

export function AppDesk() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const claims = readClaims();
  const permissions = claims.permissions ?? [];
  const superAdmin = canAccessAdministratorSettings(claims.role);
  const canUseCrm =
    claims.role !== "super-admin" &&
    permissions.some(
      (permission) =>
        permission.startsWith("crm.") ||
        permission.startsWith("estimate.") ||
        permission.startsWith("quotation.")
    );
  const canViewCrmReports = permissions.includes("crm.report.view");
  const canUseIshop = permissions.some((permission) => permission.startsWith("ishop."));
  const canManageCrmListActions = claims.role === "admin";
  const showCrmActivity = claims.role === "admin";
  const showCrmProperties = claims.role !== "manager" && claims.role !== "user";
  const [globalSearch, setGlobalSearch] = useState("");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const notificationInbox = useNotificationInboxQuery(Boolean(getToken()));
  const temaAvailability = useQuery({
    enabled: Boolean(getToken()),
    queryFn: getHoneyAvailability,
    queryKey: ["honey", "availability"]
  });
  const temaEnabled = temaAvailability.data?.enabled !== false;
  const browserNotifications = useBrowserNotificationPermission();
  const notificationPreference = useCrmCallNotificationPreference();
  const inboxNotificationIds = useRef(new Set<number>());
  const notificationInboxInitialized = useRef(false);
  const [menuNavigationRevision, setMenuNavigationRevision] = useState(0);
  const requestedPage = pageFromPath(pathname, claims.role);
  const page = accessiblePage(
    requestedPage,
    superAdmin,
    canUseCrm,
    canViewCrmReports,
    canUseIshop,
    temaEnabled
  );
  const crmOverviewQuery = useCrmOverviewQuery(
    page.startsWith("crm.") || page.startsWith("estimate.")
  );
  const select = (next: Page) => {
    setMenuNavigationRevision((revision) => revision + 1);
    void navigate({ to: `/app/${next.replaceAll(".", "/")}` });
  };
  const menuItems = buildMenu(
    page,
    select,
    superAdmin,
    canUseCrm,
    canViewCrmReports,
    canUseIshop,
    temaEnabled,
    crmOverviewQuery.data?.stats
  );

  useEffect(() => {
    if (page !== requestedPage) {
      void navigate({ replace: true, to: `/app/${page.replaceAll(".", "/")}` });
    }
  }, [navigate, page, requestedPage]);

  useEffect(() => {
    const addNotification = (event: Event) => {
      const notification = (event as CustomEvent<AppNotification>).detail;
      if (!notification) return;
      setNotifications((current) =>
        [notification, ...current.filter((item) => item.id !== notification.id)].slice(0, 20)
      );
    };
    window.addEventListener(crmInAppNotificationEvent, addNotification);
    return () => window.removeEventListener(crmInAppNotificationEvent, addNotification);
  }, []);

  useEffect(() => {
    if (!notificationInbox.data) return;
    const newItems = notificationInbox.data.filter((notification) => {
      if (inboxNotificationIds.current.has(notification.id)) return false;
      inboxNotificationIds.current.add(notification.id);
      return true;
    });
    setNotifications((current) =>
      [...notificationInbox.data, ...current]
        .reduce<AppNotification[]>((items, notification) => {
          if (!items.some((item) => item.id === String(notification.id))) {
            items.push({ ...notification, id: String(notification.id) });
          }
          return items;
        }, [])
        .slice(0, 20)
    );
    if (
      notificationInboxInitialized.current &&
      notificationPreference.enabled &&
      browserNotifications.permission === "granted"
    ) {
      newItems.forEach((notification) =>
        showCrmDesktopNotification({ ...notification, id: String(notification.id) })
      );
    }
    notificationInboxInitialized.current = true;
  }, [browserNotifications.permission, notificationInbox.data, notificationPreference.enabled]);

  function handleLogout() {
    window.location.replace("/sa/refresh");
  }

  return (
    <AuthGate>
      <>
        <ApplicationLayout
          brand={{ subtitle: "Trusted Since 2002", title: "TechMedia" }}
          globalSearchPlaceholder="Search CRM enquiries"
          globalSearchValue={globalSearch}
          headerTitle={titleFor(page)}
          menuItems={menuItems}
          notifications={notifications}
          onNotificationDismiss={(id) => {
            const notificationId = Number(id);
            if (Number.isInteger(notificationId)) void markNotificationRead(notificationId);
            setNotifications((current) => current.filter((notification) => notification.id !== id));
          }}
          onLogout={handleLogout}
          onGlobalSearchValueChange={setGlobalSearch}
          profileHref="/app/identity/profile"
          showHomeAction={false}
          showPageTitle={false}
          showSidebarUser={false}
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
              active: page === "identity.profile",
              avatar: true,
              description: "Your TechMedia profile and Frappe credentials.",
              icon: UserRoundIcon,
              title: "Account",
              url: "/app/identity/profile"
            },
            ...(canUseCrm
              ? [
                  {
                    active: page.startsWith("crm.") || page.startsWith("estimate."),
                    description: "Live Frappe enquiry and estimate workflows.",
                    icon: MessagesSquareIcon,
                    title: "CRM",
                    url: "/app/crm/overview"
                  }
                ]
              : []),
            ...(canUseIshop
              ? [
                  {
                    active: page.startsWith("ishop."),
                    description: "Manage LogicX iShop records on Frappe.",
                    icon: ShoppingBagIcon,
                    title: "iShop",
                    url: "/app/ishop/catalogs"
                  }
                ]
              : []),
            ...(temaEnabled
              ? [
                  {
                    active: page === "ai.honey",
                    description: "AI chat, content writer, and sub-agent workers.",
                    icon: BotIcon,
                    title: "TEMA",
                    url: "/app/ai/honey"
                  }
                ]
              : []),
            ...(superAdmin
              ? [
                  {
                    active:
                      (page.startsWith("identity.") && page !== "identity.profile") ||
                      page.startsWith("settings."),
                    description: "Identity, Frappe connection, and user credentials.",
                    icon: PlugZapIcon,
                    title: "Admin",
                    url: "/app/settings/frappe/overview"
                  }
                ]
              : [])
          ]}
        >
          <main className="w-full space-y-4 px-2 py-2 lg:px-3 lg:py-3">
            <Suspense fallback={<GlobalLoader />}>
              <Fragment key={`${page}-${menuNavigationRevision}`}>
                {renderPage(
                  page,
                  claims,
                  permissions,
                  superAdmin,
                  canUseCrm,
                  canManageCrmListActions,
                  showCrmActivity,
                  showCrmProperties,
                  globalSearch,
                  setGlobalSearch
                )}
              </Fragment>
            </Suspense>
          </main>
        </ApplicationLayout>
        {temaEnabled && page !== "ai.honey" ? (
          <TemaMascot onOpen={() => select("ai.honey")} />
        ) : null}
      </>
    </AuthGate>
  );
}

function renderPage(
  page: Page,
  claims: Claims,
  permissions: string[],
  superAdmin: boolean,
  canUseCrm: boolean,
  canManageCrmListActions: boolean,
  showCrmActivity: boolean,
  showCrmProperties: boolean,
  globalSearch: string,
  onGlobalSearchValueChange: (value: string) => void
) {
  if (page === "ai.connector")
    return superAdmin ? <AgentConnectorWorkspace /> : <UserProfileWorkspace />;
  if (page === "ai.skills")
    return superAdmin ? <SkillLibraryWorkspace /> : <UserProfileWorkspace />;
  if (page === "ai.honey") return <HoneyWorkspace />;
  if (isAdministratorPage(page) && !superAdmin) {
    return canUseCrm ? <CrmOverview /> : <UserProfileWorkspace />;
  }
  if (page === "identity.users") return <UserWorkspace actorEmail={claims.email} />;
  if (page === "identity.roles") return <RoleWorkspace />;
  if (page === "identity.permissions") return <PermissionWorkspace />;
  if (page === "identity.access") return <RolePermissionWorkspace />;
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
  if (page === "settings.notifications") return <CrmNotificationSettings />;
  if (page === "crm.overview") {
    return <CrmOverview />;
  }
  if (page === "crm.reports") return <CrmReports />;
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
  if (page.startsWith("ishop.")) {
    return (
      <IshopWorkspace
        page={
          page.slice("ishop.".length) as import("../../modules/ishop/ishop.workspace").IshopPage
        }
      />
    );
  }
  if (!canUseCrm) return <UserProfileWorkspace />;
  const view = page === "crm.created" ? "created" : page === "crm.open" ? "open" : "assigned";
  return (
    <CrmWorkspace
      canAssign={permissions.includes("crm.enquiry.assign")}
      canCreate={page === "crm.created"}
      canCreateEstimate={
        permissions.includes("estimate.create") || permissions.includes("crm.enquiry.create")
      }
      canCreateQuotation={
        permissions.includes("quotation.create") || permissions.includes("crm.enquiry.create")
      }
      canForceDelete={permissions.includes("crm.enquiry.force-delete")}
      canManageJobs={permissions.includes("crm.job.manage")}
      canMobileLookup={page === "crm.created"}
      canRefresh={canManageCrmListActions}
      showActivity={showCrmActivity}
      showProperties={showCrmProperties}
      canSuspend={false}
      canUpdate={permissions.includes("crm.enquiry.update")}
      canUpdateEstimate={
        permissions.includes("estimate.update") || permissions.includes("crm.enquiry.update")
      }
      canUpdateQuotation={
        permissions.includes("quotation.update") || permissions.includes("crm.enquiry.update")
      }
      onSearchValueChange={onGlobalSearchValueChange}
      searchValue={globalSearch}
      view={view}
    />
  );
}

function buildMenu(
  page: Page,
  select: (page: Page) => void,
  superAdmin: boolean,
  canUseCrm: boolean,
  canViewCrmReports: boolean,
  canUseIshop: boolean,
  temaEnabled: boolean,
  crmStats?: CrmEnquiryOverview["stats"]
): SidemenuItem[] {
  const item = (title: string, target: Page, badge?: number) => ({
    ...(badge !== undefined ? { badge } : {}),
    isActive: page === target,
    onSelect: () => select(target),
    title
  });
  const notificationSettings = {
    icon: Settings2Icon,
    isActive: page.startsWith("settings."),
    items: [
      item("Desktop notifications", "settings.notifications"),
      ...(superAdmin
        ? [
            { ...item("Frappe connection", "settings.frappe.overview"), icon: CircleGaugeIcon },
            { ...item("Frappe Users", "settings.frappe.users"), icon: UserRoundPlusIcon }
          ]
        : [])
    ],
    title: "Settings"
  };
  if (canUseIshop && page.startsWith("ishop.")) {
    return [
      {
        icon: ShoppingBagIcon,
        isActive: true,
        items: [
          item("Catalogs", "ishop.catalogs"),
          item("Categories", "ishop.categories"),
          item("Brands", "ishop.brands"),
          item("Products", "ishop.products"),
          item("Product Details", "ishop.items"),
          item("Product Variants", "ishop.variants"),
          item("Product Images", "ishop.images")
        ],
        title: "LogicX iShop"
      },
      notificationSettings
    ];
  }
  if (canUseCrm && (!superAdmin || page.startsWith("crm.") || page.startsWith("estimate."))) {
    return [
      {
        icon: MessagesSquareIcon,
        isActive: true,
        items: [
          { ...item("Overview", "crm.overview"), icon: CircleGaugeIcon },
          item("My Job", "crm.assigned", crmStats?.myEnquiries),
          item("My Calls", "crm.created", crmStats?.createdByMe),
          ...(superAdmin ? [item("Open Enquiry", "crm.open")] : []),
          ...(canViewCrmReports ? [item("Reports", "crm.reports")] : [])
        ],
        title: "CRM"
      },
      notificationSettings,
      ...(temaEnabled || superAdmin
        ? [temaMenu(page, item, superAdmin, temaEnabled)]
        : [])
    ];
  }
  return [
    ...(temaEnabled || superAdmin ? [temaMenu(page, item, superAdmin, temaEnabled)] : []),
    {
      icon: ShieldCheckIcon,
      isActive: page.startsWith("identity."),
      items: [
        item("Users", "identity.users"),
        item("Roles", "identity.roles"),
        item("Permissions", "identity.permissions"),
        item("Access controls", "identity.access")
      ],
      title: "Identity"
    },
    notificationSettings
  ];
}

function accessiblePage(
  page: Page,
  superAdmin: boolean,
  canUseCrm: boolean,
  canViewCrmReports: boolean,
  canUseIshop: boolean,
  temaEnabled: boolean
): Page {
  if (page === "ai.honey" && !temaEnabled)
    return superAdmin ? "ai.skills" : canUseCrm ? "crm.overview" : "identity.profile";
  if (isAdministratorPage(page) && !superAdmin)
    return canUseCrm ? "crm.overview" : "identity.profile";
  if (page === "crm.reports" && !canViewCrmReports)
    return canUseCrm ? "crm.overview" : "identity.profile";
  if (!canUseCrm && (page.startsWith("crm.") || page === "estimate.list"))
    return "identity.profile";
  if (!canUseIshop && page.startsWith("ishop."))
    return canUseCrm ? "crm.overview" : "identity.profile";
  return page;
}

function temaMenu(
  page: Page,
  item: (title: string, target: Page, badge?: number) => {
    badge?: number;
    isActive: boolean;
    onSelect: () => void;
    title: string;
  },
  superAdmin: boolean,
  temaEnabled: boolean
): SidemenuItem {
  return {
    icon: BotIcon,
    isActive: page === "ai.honey" || page === "ai.connector" || page === "ai.skills",
    items: [
      ...(temaEnabled ? [item("Business agent chat", "ai.honey")] : []),
      ...(superAdmin
        ? [item("Agent Connector", "ai.connector"), item("Skills & availability", "ai.skills")]
        : [])
    ],
    title: "TEMA AI"
  };
}

function isAdministratorPage(page: Page) {
  return (
    page === "crm.open" ||
    page === "ai.connector" ||
    page === "ai.skills" ||
    (page.startsWith("settings.") && page !== "settings.notifications") ||
    (page.startsWith("identity.") && page !== "identity.profile")
  );
}

function pageFromPath(pathname: string, role: string | undefined): Page {
  const value = pathname.replace(/^\/app\/?/u, "").replaceAll("/", ".");
  const allowed: Page[] = [
    "identity.users",
    "identity.roles",
    "identity.permissions",
    "identity.access",
    "identity.profile",
    "settings.frappe.overview",
    "settings.frappe.users",
    "settings.notifications",
    "crm.overview",
    "crm.assigned",
    "crm.created",
    "crm.open",
    "crm.reports",
    "estimate.list",
    "ai.honey",
    "ai.connector",
    "ai.skills",
    "ishop.catalogs",
    "ishop.categories",
    "ishop.brands",
    "ishop.products",
    "ishop.items",
    "ishop.variants",
    "ishop.images"
  ];
  if (allowed.includes(value as Page)) return value as Page;
  return applicationEntryPath(role)
    .replace(/^\/app\//u, "")
    .replaceAll("/", ".") as Page;
}

function titleFor(page: Page) {
  const labels: Partial<Record<Page, string>> = {
    "crm.assigned": "My Job",
    "crm.created": "My Calls",
    "crm.open": "Open Enquiry",
    "crm.reports": "Enquiry reports",
    "estimate.list": "Estimate",
    "settings.frappe.overview": "Frappe connection",
    "settings.frappe.users": "Frappe Users",
    "settings.notifications": "Desktop notifications",
    "ai.honey": "TEMA AI",
    "ai.connector": "Agent Connector",
    "ai.skills": "TEMA Skills",
    "ishop.catalogs": "Catalogs",
    "ishop.categories": "Categories",
    "ishop.brands": "Brands",
    "ishop.products": "Products",
    "ishop.items": "Product Details",
    "ishop.variants": "Product Variants",
    "ishop.images": "Product Images"
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
