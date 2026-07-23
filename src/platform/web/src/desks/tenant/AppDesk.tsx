import { lazy, useEffect, useMemo, useState, type ComponentType } from "react";
import { LayoutDashboardIcon, PlugZapIcon, RocketIcon, UserRoundIcon } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@codexsun/ui/components/button";
import { Card } from "@codexsun/ui/components/card";
import { GlobalLoader } from "@codexsun/ui/components/global-loader";
import { Label } from "@codexsun/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@codexsun/ui/components/radio-group";
import { StatusBadge } from "@codexsun/ui/components/StatusBadge";
import { ApplicationLayout } from "@codexsun/ui/layouts/application-layout";
import { AuthGate } from "../../shared/auth/AuthGate";
import {
  appMenuItemsFor,
  appWorkspaceItems,
  defaultLandingApp,
  enabledAppIds,
  type PlatformAppId
} from "../../app/app-registry";
import { getTenantRuntime } from "../../modules/tenant/tenant.services";
import { listCompanies, useCompanyBranding } from "@codexsun/core-web/modules/organisation/company";
import {
  defaultCompanyQueryKey,
  getDefaultCompany,
  saveDefaultCompany,
  type LandingAppOption
} from "@codexsun/core-web/modules/organisation/default-company";
import { listFinancialYears } from "@codexsun/core-web/modules/organisation/financial-year";
import { getToken, logout } from "../../shared/api/platform-api";
import { setPlatformDocumentTitle } from "../../shared/document/PageTitle";

function lazyWorkspace<Props>(loader: () => Promise<ComponentType<Props>>) {
  return lazy(async () => ({ default: await loader() }));
}

const AddressTypesWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/common/contacts/address-types").then(
    (module) => module.AddressTypesWorkspace
  )
);
const BankNamesWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/common/contacts/bank-names").then(
    (module) => module.BankNamesWorkspace
  )
);
const ContactGroupsWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/common/contacts/contact-groups").then(
    (module) => module.ContactGroupsWorkspace
  )
);
const ContactTypesWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/common/contacts/contact-types").then(
    (module) => module.ContactTypesWorkspace
  )
);
const CityWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/common/location/city").then((module) => module.CityWorkspace)
);
const CountryWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/common/location/country").then(
    (module) => module.CountryWorkspace
  )
);
const DistrictWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/common/location/district").then(
    (module) => module.DistrictWorkspace
  )
);
const PincodeWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/common/location/pincode").then(
    (module) => module.PincodeWorkspace
  )
);
const StateWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/common/location/state").then((module) => module.StateWorkspace)
);
const LedgerGroupsWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/common/accounts/ledger-groups").then(
    (module) => module.LedgerGroupsWorkspace
  )
);
const LedgersWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/common/accounts/ledgers").then(
    (module) => module.LedgersWorkspace
  )
);
const CurrenciesWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/common/others/currencies").then(
    (module) => module.CurrenciesWorkspace
  )
);
const MonthsWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/common/others/months").then((module) => module.MonthsWorkspace)
);
const PaymentTermsWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/common/others/payment-terms").then(
    (module) => module.PaymentTermsWorkspace
  )
);
const PrioritiesWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/common/others/priorities").then(
    (module) => module.PrioritiesWorkspace
  )
);
const SalesTypesWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/common/others/sales-types").then(
    (module) => module.SalesTypesWorkspace
  )
);
const BrandsWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/common/products/brands").then(
    (module) => module.BrandsWorkspace
  )
);
const ColoursWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/common/products/colours").then(
    (module) => module.ColoursWorkspace
  )
);
const HsnCodesWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/common/products/hsn-codes").then(
    (module) => module.HsnCodesWorkspace
  )
);
const ProductCategoriesWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/common/products/product-categories").then(
    (module) => module.ProductCategoriesWorkspace
  )
);
const ProductGroupsWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/common/products/product-groups").then(
    (module) => module.ProductGroupsWorkspace
  )
);
const ProductTypesWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/common/products/product-types").then(
    (module) => module.ProductTypesWorkspace
  )
);
const SizesWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/common/products/sizes").then((module) => module.SizesWorkspace)
);
const StylesWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/common/products/styles").then(
    (module) => module.StylesWorkspace
  )
);
const TaxesWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/common/products/taxes").then((module) => module.TaxesWorkspace)
);
const UnitsWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/common/products/units").then((module) => module.UnitsWorkspace)
);
const DestinationsWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/common/workorder/destinations").then(
    (module) => module.DestinationsWorkspace
  )
);
const StockRejectionTypesWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/common/workorder/stock-rejection-types").then(
    (module) => module.StockRejectionTypesWorkspace
  )
);
const TransportsWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/common/workorder/transports").then(
    (module) => module.TransportsWorkspace
  )
);
const WarehousesWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/common/workorder/warehouses").then(
    (module) => module.WarehousesWorkspace
  )
);
const WorkOrderTypesWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/common/workorder/work-order-types").then(
    (module) => module.WorkOrderTypesWorkspace
  )
);
const ContactWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/master/contact").then((module) => module.ContactWorkspace)
);
const ProductWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/master/product").then((module) => module.ProductWorkspace)
);
const WorkOrderWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/master/work-order").then((module) => module.WorkOrderWorkspace)
);
const CompanyWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/organisation/company").then(
    (module) => module.CompanyWorkspace
  )
);
const DefaultCompanyWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/organisation/default-company").then(
    (module) => module.DefaultCompanyWorkspace
  )
);
const FinancialYearWorkspace = lazyWorkspace(() =>
  import("@codexsun/core-web/modules/organisation/financial-year").then(
    (module) => module.FinancialYearWorkspace
  )
);
const TenantUserWorkspace = lazy(() =>
  import("../../modules/tenant-user").then((module) => ({ default: module.TenantUserWorkspace }))
);
const TenantRoleWorkspace = lazy(() =>
  import("../../modules/tenant-role").then((module) => ({ default: module.TenantRoleWorkspace }))
);
const TenantPermissionWorkspace = lazy(() =>
  import("../../modules/tenant-permission").then((module) => ({
    default: module.TenantPermissionWorkspace
  }))
);
const TenantUserRoleWorkspace = lazy(() =>
  import("../../modules/tenant-user-role").then((module) => ({
    default: module.TenantUserRoleWorkspace
  }))
);
const TenantRolePermissionWorkspace = lazy(() =>
  import("../../modules/tenant-role-permission").then((module) => ({
    default: module.TenantRolePermissionWorkspace
  }))
);
const CrmWorkspace = lazy(() =>
  import("../../modules/crm").then((module) => ({ default: module.CrmWorkspace }))
);
const CrmOverview = lazy(() =>
  import("../../modules/crm").then((module) => ({ default: module.CrmOverview }))
);
const FrappeOverview = lazy(() =>
  import("../../modules/frappe").then((module) => ({ default: module.FrappeOverview }))
);
const FrappeWorkspace = lazy(() =>
  import("../../modules/frappe").then((module) => ({ default: module.FrappeWorkspace }))
);

type AppPage =
  | "application.overview"
  | "application.landing"
  | "application.profile"
  | "application.settings"
  | "application.access.users"
  | "application.access.roles"
  | "application.access.permissions"
  | "application.access.user-roles"
  | "application.access.role-permissions"
  | "crm.overview"
  | "crm.enquiry.assigned"
  | "crm.enquiry.created"
  | "crm.enquiry.open"
  | "frappe.overview"
  | "frappe.settings"
  | "core.common.location.countries"
  | "core.common.location.states"
  | "core.common.location.districts"
  | "core.common.location.cities"
  | "core.common.location.pincodes"
  | "core.organisation.company"
  | "core.organisation.financial-year"
  | "core.organisation.default-company"
  | "core.master.contact"
  | "core.master.product"
  | "core.master.work-order"
  | `core.common.${"accounts" | "contacts" | "others" | "products" | "workorder"}.${string}`;
const LANDING_APP_STORAGE_KEY = "techmedia.tenant.landing-app.live";
const COMPANY_CONTEXT_STORAGE_KEY = "codexsun.tenant.company-id";
const ACCOUNTING_YEAR_CONTEXT_STORAGE_KEY = "codexsun.tenant.financial-year-id";

export function AppDesk() {
  const queryClient = useQueryClient();
  const signedInUser = signedInTenantUser();
  const [page, setPage] = useState<AppPage>(() => pageFromUrl(readPublishedLandingApp()));
  const [publishedLandingApp, setPublishedLandingApp] = useState<PlatformAppId | null>(() =>
    readPublishedLandingApp()
  );
  const [shouldResolveLandingPath, setShouldResolveLandingPath] = useState(() => isAppRootPath());
  const runtimeQuery = useQuery({
    queryFn: getTenantRuntime,
    queryKey: ["tenant", "runtime"]
  });
  const companiesQuery = useQuery({
    enabled: Boolean(runtimeQuery.data?.tenant?.uuid),
    queryFn: () => listCompanies(),
    queryKey: ["core", "organisation", "companies", runtimeQuery.data?.tenant?.uuid]
  });
  const financialYearsQuery = useQuery({
    enabled: Boolean(runtimeQuery.data?.tenant?.uuid),
    queryFn: listFinancialYears,
    queryKey: ["core", "organisation", "financial-years", runtimeQuery.data?.tenant?.uuid]
  });
  const defaultCompanyQuery = useQuery({
    enabled: Boolean(runtimeQuery.data?.tenant?.uuid),
    queryFn: getDefaultCompany,
    queryKey: [...defaultCompanyQueryKey, runtimeQuery.data?.tenant?.uuid]
  });
  const [companyContextId, setCompanyContextId] = useState<number | null>(null);
  const [financialYearContextId, setFinancialYearContextId] = useState<number | null>(null);
  const runtime = runtimeQuery.data;
  const moduleKeys = runtime?.tenant?.enabledModuleKeys ?? ["platform.application"];
  const registeredApps = enabledAppIds(moduleKeys);
  const enabledApps = accessibleApps(registeredApps, signedInUser);
  const switchableApps = uniqueApps(enabledApps);
  const configuredLandingApp =
    runtime?.defaultLandingApp ?? defaultLandingApp(runtime?.tenant?.defaultLandingApp, moduleKeys);
  const runtimeLandingApp = enabledApps.includes(configuredLandingApp)
    ? configuredLandingApp
    : (enabledApps[0] ?? "crm");
  const activeDefaultCompany =
    defaultCompanyQuery.data?.status === "active" ? defaultCompanyQuery.data : null;
  const persistedLandingApp = activeDefaultCompany?.landingApp as PlatformAppId | undefined;
  const landingApp =
    publishedLandingApp && enabledApps.includes(publishedLandingApp)
      ? publishedLandingApp
      : persistedLandingApp && enabledApps.includes(persistedLandingApp)
        ? persistedLandingApp
        : runtimeLandingApp;
  const activeApp = pageAllowed(page, signedInUser, switchableApps)
    ? appFromPage(page, landingApp, switchableApps)
    : (switchableApps[0] ?? "crm");
  const activeCompanies = useMemo(
    () => (companiesQuery.data ?? []).filter((company) => company.isActive),
    [companiesQuery.data]
  );
  const selectedCompany =
    activeCompanies.find((company) => company.id === activeDefaultCompany?.companyId) ??
    activeCompanies[0] ??
    null;
  const companyBranding = useCompanyBranding(selectedCompany?.id ?? null);
  const activeFinancialYears = useMemo(
    () => (financialYearsQuery.data ?? []).filter((year) => year.status === "active"),
    [financialYearsQuery.data]
  );
  const selectedFinancialYear =
    activeFinancialYears.find((year) => year.id === activeDefaultCompany?.financialYearId) ??
    activeFinancialYears.find((year) => year.isCurrent) ??
    activeFinancialYears[0] ??
    null;
  const safePage = pageAllowed(page, signedInUser, switchableApps)
    ? page
    : pageForApp(switchableApps[0] ?? "crm", signedInUser.permissions);
  const activePageTitle = titleForPage(safePage);
  const accountingYear = selectedFinancialYear?.name ?? "Accounting year";
  const defaultSelectionMutation = useMutation({
    mutationFn: saveDefaultCompany,
    onSuccess: async (record) => {
      publishCompanyContext(record.companyId);
      publishAccountingYear(record.financialYearId);
      await queryClient.invalidateQueries({ queryKey: defaultCompanyQueryKey });
    }
  });

  useEffect(() => {
    setPlatformDocumentTitle(activePageTitle);
  }, [activePageTitle]);

  useEffect(() => {
    if (publishedLandingApp && !enabledApps.includes(publishedLandingApp)) {
      setPublishedLandingApp(null);
      window.localStorage.removeItem(LANDING_APP_STORAGE_KEY);
    }
  }, [enabledApps, publishedLandingApp]);

  useEffect(() => {
    if (!selectedCompany) {
      setCompanyContextId(null);
      return;
    }
    publishCompanyContext(selectedCompany.id);
    setCompanyContextId(selectedCompany.id);
  }, [selectedCompany]);

  useEffect(() => {
    if (!selectedFinancialYear) {
      setFinancialYearContextId(null);
      return;
    }
    publishAccountingYear(selectedFinancialYear.id);
    setFinancialYearContextId(selectedFinancialYear.id);
  }, [selectedFinancialYear]);

  useEffect(() => {
    if (!shouldResolveLandingPath) return;
    if (!publishedLandingApp && runtimeQuery.isLoading) return;

    const landingPage = pageForApp(landingApp, signedInUser.permissions);
    setPage(landingPage);
    setShouldResolveLandingPath(false);
    window.history.replaceState({ page: landingPage }, "", `/app/${landingPage.replace(".", "/")}`);
    setPlatformDocumentTitle(titleForPage(landingPage));
  }, [landingApp, publishedLandingApp, runtimeQuery.isLoading, shouldResolveLandingPath]);

  useEffect(() => {
    if (page === safePage) return;
    setPage(safePage);
    window.history.replaceState({ page: safePage }, "", `/app/${safePage.replaceAll(".", "/")}`);
  }, [page, safePage]);

  function selectPage(nextPage: AppPage) {
    setPage(nextPage);
    window.history.pushState({ page: nextPage }, "", `/app/${nextPage.replaceAll(".", "/")}`);
    setPlatformDocumentTitle(titleForPage(nextPage));
  }

  function publishLandingApp(nextLandingApp: PlatformAppId) {
    setPublishedLandingApp(nextLandingApp);
    window.localStorage.setItem(LANDING_APP_STORAGE_KEY, nextLandingApp);
  }

  async function handleLogout() {
    await logout("tenant");
    window.location.assign("/login");
  }

  function updateGlobalDefault(companyId: number, financialYearId: number) {
    defaultSelectionMutation.mutate({
      companyId,
      financialYearId,
      landingApp,
      status: "active"
    });
  }

  const activeWorkspaceTitle =
    activeApp === "crm" ? "CRM" : activeApp === "frappe" ? "Frappe" : "Application";
  const menuItems = appMenuItemsFor(
    activeApp,
    safePage,
    (nextPage) => selectPage(nextPage as AppPage),
    signedInUser.permissions
  );
  const workspaceItems = appWorkspaceItems(switchableApps, activeApp).map((item) => ({
    ...item,
    onSelect: () => selectPage(pageForApp(item.id, signedInUser.permissions)),
    url: `/app/${pageForApp(item.id, signedInUser.permissions).replaceAll(".", "/")}`
  }));

  const contextError =
    !companiesQuery.isLoading && runtime?.tenant && !selectedCompany
      ? new Error("No active company is available for this tenant.")
      : !financialYearsQuery.isLoading && runtime?.tenant && !selectedFinancialYear
        ? new Error("No active financial year is available for this tenant.")
        : null;

  const bootstrapLoading =
    runtimeQuery.isLoading ||
    companiesQuery.isLoading ||
    financialYearsQuery.isLoading ||
    defaultCompanyQuery.isLoading ||
    (!companyContextId && !contextError) ||
    (!financialYearContextId && !contextError);
  const bootstrapError =
    runtimeQuery.error ??
    companiesQuery.error ??
    financialYearsQuery.error ??
    defaultCompanyQuery.error ??
    contextError;

  if (bootstrapError) {
    return (
      <AuthGate desk="tenant">
        <TenantBootstrapErrorScreen error={bootstrapError} />
      </AuthGate>
    );
  }

  if (bootstrapLoading) {
    return (
      <AuthGate desk="tenant">
        <GlobalLoader />
      </AuthGate>
    );
  }

  if (switchableApps.length === 0) {
    return (
      <AuthGate desk="tenant">
        <main className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
          <Card title="No application access">
            <StatusBadge tone="amber">Restricted</StatusBadge>
            <p className="mt-4 text-sm text-muted-foreground">
              Your account has no enabled application permission. Ask a tenant administrator to
              assign the appropriate application role.
            </p>
          </Card>
        </main>
      </AuthGate>
    );
  }

  return (
    <AuthGate desk="tenant">
      <ApplicationLayout
        brand={{
          href: `/app/${pageForApp(activeApp, signedInUser.permissions).replaceAll(".", "/")}`,
          ...(companyBranding.lightLogoUrl ? { logoSrc: companyBranding.lightLogoUrl } : {}),
          ...(companyBranding.darkLogoUrl ? { logoDarkSrc: companyBranding.darkLogoUrl } : {}),
          logoAlt: `${selectedCompany?.name ?? "Company"} logo`,
          options: activeCompanies.map((company) => ({
            id: String(company.id),
            subtitle: accountingYear,
            title: company.name
          })),
          optionsLabel: "Company",
          onOptionSelect: (id) => {
            if (!selectedFinancialYear) return;
            updateGlobalDefault(Number(id), selectedFinancialYear.id);
          },
          onSecondaryOptionSelect: (id) => {
            if (!selectedCompany) return;
            updateGlobalDefault(selectedCompany.id, Number(id));
          },
          ...(selectedCompany ? { selectedOptionId: String(selectedCompany.id) } : {}),
          ...(selectedFinancialYear
            ? { selectedSecondaryOptionId: String(selectedFinancialYear.id) }
            : {}),
          secondaryOptions: activeFinancialYears.map((year) => ({
            id: String(year.id),
            title: year.name
          })),
          secondaryOptionsLabel: "Financial year",
          subtitle: selectedFinancialYear
            ? selectedFinancialYear.name
            : `${activeWorkspaceTitle.toLowerCase()} workspace`,
          title: selectedCompany?.name ?? activeWorkspaceTitle
        }}
        headerTitle={activePageTitle}
        homeHref="/"
        menuItems={menuItems}
        onLogout={handleLogout}
        subtitle={null}
        title={null}
        user={signedInUser}
        versionLabel={`v ${__APP_VERSION__}`}
        workspaceItems={workspaceItems}
      >
        <main className="mx-auto w-[calc(100%-2rem)] max-w-[92rem] space-y-5 py-4 lg:w-[calc(100%-3rem)] lg:py-5">
          {safePage === "application.overview" ? (
            <ApplicationOverview signedInUser={signedInUser} />
          ) : null}
          {safePage === "application.landing" ? (
            <LandingDesk
              enabledApps={enabledApps}
              landingApp={landingApp}
              onPublish={publishLandingApp}
            />
          ) : null}
          {safePage === "application.profile" ? <ApplicationProfile /> : null}
          {safePage === "application.settings" ? <ApplicationSettings /> : null}
          {safePage === "application.access.users" ? <TenantUserWorkspace /> : null}
          {safePage === "application.access.roles" ? <TenantRoleWorkspace /> : null}
          {safePage === "application.access.permissions" ? <TenantPermissionWorkspace /> : null}
          {safePage === "application.access.user-roles" ? <TenantUserRoleWorkspace /> : null}
          {safePage === "application.access.role-permissions" ? (
            <TenantRolePermissionWorkspace />
          ) : null}
          {safePage === "crm.overview" ? <CrmOverview signedInUser={signedInUser} /> : null}
          {safePage === "frappe.overview" ? <FrappeOverview signedInUser={signedInUser} /> : null}
          {safePage === "frappe.settings" ? (
            <FrappeWorkspace
              canUpdate={signedInUser.permissions.includes("frappe.connection.update")}
            />
          ) : null}
          {safePage === "crm.enquiry.assigned" ? (
            <CrmWorkspace
              canAssign={signedInUser.permissions.includes("crm.enquiry.assign")}
              canCreate={signedInUser.permissions.includes("crm.enquiry.create")}
              canForceDelete={signedInUser.tenantRole === "admin"}
              canSuspend={
                signedInUser.tenantRole === "admin" ||
                signedInUser.permissions.includes("crm.enquiry.suspend")
              }
              canUpdate={signedInUser.permissions.includes("crm.enquiry.update")}
              view="assigned"
            />
          ) : null}
          {safePage === "crm.enquiry.created" ? (
            <CrmWorkspace
              canAssign={signedInUser.permissions.includes("crm.enquiry.assign")}
              canCreate={signedInUser.permissions.includes("crm.enquiry.create")}
              canForceDelete={signedInUser.tenantRole === "admin"}
              canSuspend={
                signedInUser.tenantRole === "admin" ||
                signedInUser.permissions.includes("crm.enquiry.suspend")
              }
              canUpdate={signedInUser.permissions.includes("crm.enquiry.update")}
              view="created"
            />
          ) : null}
          {safePage === "crm.enquiry.open" ? (
            <CrmWorkspace
              canAssign={signedInUser.permissions.includes("crm.enquiry.assign")}
              canCreate={signedInUser.permissions.includes("crm.enquiry.create")}
              canForceDelete={signedInUser.tenantRole === "admin"}
              canSuspend={
                signedInUser.tenantRole === "admin" ||
                signedInUser.permissions.includes("crm.enquiry.suspend")
              }
              canUpdate={signedInUser.permissions.includes("crm.enquiry.update")}
              view="open"
            />
          ) : null}
          {safePage === "core.organisation.company" ? <CompanyWorkspace /> : null}
          {safePage === "core.organisation.financial-year" ? <FinancialYearWorkspace /> : null}
          {safePage === "core.organisation.default-company" ? (
            <DefaultCompanyWorkspace
              landingApps={landingAppOptions(switchableApps)}
              onSaved={() => {
                void defaultCompanyQuery.refetch();
                void financialYearsQuery.refetch();
              }}
            />
          ) : null}
          {renderOwnedLocationPage(safePage)}
          {renderOwnedCommonMasterPage(safePage)}
          {safePage === "core.master.contact" ? <ContactWorkspace key={safePage} /> : null}
          {safePage === "core.master.product" ? <ProductWorkspace key={safePage} /> : null}
          {safePage === "core.master.work-order" ? <WorkOrderWorkspace key={safePage} /> : null}
        </main>
      </ApplicationLayout>
    </AuthGate>
  );
}

function TenantBootstrapErrorScreen({ error }: { error: unknown }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md rounded-md border border-border bg-card p-6 shadow-sm">
        <div className="text-base font-semibold">Application setup could not be loaded</div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {error instanceof Error ? error.message : "An unexpected setup error occurred."}
        </p>
      </div>
    </main>
  );
}

function publishCompanyContext(id: number) {
  window.localStorage.setItem(COMPANY_CONTEXT_STORAGE_KEY, String(id));
  window.dispatchEvent(new CustomEvent("codexsun:company-change", { detail: { id } }));
}
function publishAccountingYear(id: number) {
  window.localStorage.setItem(ACCOUNTING_YEAR_CONTEXT_STORAGE_KEY, String(id));
  window.dispatchEvent(new CustomEvent("codexsun:accounting-year-change", { detail: { id } }));
}

function landingAppOptions(apps: PlatformAppId[]): LandingAppOption[] {
  return apps.map((app) => ({
    label: app === "crm" ? "CRM" : app === "frappe" ? "Frappe" : "Application",
    value: app
  }));
}

function uniqueApps(apps: PlatformAppId[]) {
  return Array.from(new Set(apps));
}

function pageFromUrl(landingApp: PlatformAppId | null): AppPage {
  const [, , app, ...children] = window.location.pathname.split("/");
  if (!app) return pageForApp(landingApp ?? "application", []);

  const key = `${app}.${children.filter(Boolean).join(".") || "overview"}`;
  if (
    key === "application.overview" ||
    key === "application.landing" ||
    key === "application.profile" ||
    key === "application.settings" ||
    key === "application.access.users" ||
    key === "application.access.roles" ||
    key === "application.access.permissions" ||
    key === "application.access.user-roles" ||
    key === "application.access.role-permissions" ||
    key === "crm.overview" ||
    key === "crm.enquiry.assigned" ||
    key === "crm.enquiry.created" ||
    key === "crm.enquiry.open" ||
    key === "frappe.overview" ||
    key === "frappe.settings" ||
    key === "core.common.location.countries" ||
    key === "core.common.location.states" ||
    key === "core.common.location.districts" ||
    key === "core.common.location.cities" ||
    key === "core.common.location.pincodes" ||
    key === "core.organisation.company" ||
    key === "core.organisation.financial-year" ||
    key === "core.organisation.default-company" ||
    key === "core.master.contact" ||
    key === "core.master.product" ||
    key === "core.master.work-order" ||
    isCommonMasterPage(key)
  ) {
    return key as AppPage;
  }
  return pageForApp(landingApp ?? "application", []);
}

function LandingDesk({
  enabledApps,
  landingApp,
  onPublish
}: {
  enabledApps: PlatformAppId[];
  landingApp: PlatformAppId;
  onPublish: (app: PlatformAppId) => void;
}) {
  const [draftLandingApp, setDraftLandingApp] = useState<PlatformAppId>(landingApp);
  const dirty = draftLandingApp !== landingApp;

  useEffect(() => {
    setDraftLandingApp(landingApp);
  }, [landingApp]);

  const choices = enabledApps.map((appId) => ({
    description:
      appId === "crm"
        ? "Assigned, created, and open enquiries with schedules and workspace notes."
        : appId === "frappe"
          ? "Encrypted Frappe CRM connection settings for the upcoming sync workflows."
          : "Shared workspace, organisation, masters, roles, and application desk.",
    icon: appId === "frappe" ? PlugZapIcon : LayoutDashboardIcon,
    iconClass: appId === "frappe" ? "bg-violet-700 text-white" : "bg-slate-950 text-white",
    id: appId,
    label: appId === "crm" ? "CRM" : appId === "frappe" ? "Frappe" : "Application"
  })) satisfies Array<{
    description: string;
    icon: typeof LayoutDashboardIcon;
    iconClass: string;
    id: PlatformAppId;
    label: string;
  }>;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Landing Desk</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose which enabled app opens first for this workspace.
          </p>
        </div>
        <Button disabled={!dirty} icon={<RocketIcon />} onClick={() => onPublish(draftLandingApp)}>
          Publish live
        </Button>
      </div>

      <div className="rounded-md border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-normal">Default landing app</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Only enabled apps are available as landing choices.
            </p>
          </div>
          <StatusBadge tone={dirty ? "amber" : "green"}>
            {dirty ? "Draft not live" : "Live"}
          </StatusBadge>
        </div>

        <RadioGroup
          value={draftLandingApp}
          onValueChange={(value) => setDraftLandingApp(value as PlatformAppId)}
          className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3"
        >
          {choices.map((choice) => {
            const Icon = choice.icon;
            const selected = draftLandingApp === choice.id;

            return (
              <Label
                key={choice.id}
                className={`flex min-h-[98px] cursor-pointer items-start gap-3 rounded-md border p-4 transition-colors ${
                  selected ? "border-border bg-muted/70" : "bg-background hover:bg-muted/35"
                }`}
              >
                <RadioGroupItem value={choice.id} className="mt-1" />
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-md ${choice.iconClass}`}
                >
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{choice.label}</span>
                  </span>
                  <span className="mt-2 block text-sm font-normal leading-5 text-muted-foreground">
                    {choice.description}
                  </span>
                </span>
              </Label>
            );
          })}
        </RadioGroup>
      </div>
    </section>
  );
}

function ApplicationOverview({
  signedInUser
}: {
  signedInUser: ReturnType<typeof signedInTenantUser>;
}) {
  return (
    <section>
      <div className="overflow-hidden rounded-md border bg-card shadow-sm">
        <div className="relative min-h-36 p-5 md:p-6">
          <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-gradient-to-l from-indigo-100 via-sky-50 to-transparent md:block" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-md bg-slate-950 text-white shadow-sm">
                <LayoutDashboardIcon className="size-7" />
              </span>
              <div>
                <p className="text-sm font-semibold uppercase text-muted-foreground">Application</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-normal">Application Desk</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  Tenant application workspace for landing setup, platform profile, settings, users,
                  and access.
                </p>
              </div>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border bg-background/90 px-4 py-2 text-sm font-medium shadow-sm">
              <UserRoundIcon className="size-4" />
              <span>
                Signed in as {signedInUser.name} · {signedInUser.email}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ApplicationProfile() {
  return (
    <Card
      title="Application Profile"
      description="Platform identity, workspace access, and tenant context."
    >
      <div className="flex flex-wrap gap-2">
        <StatusBadge tone="green">Always enabled</StatusBadge>
      </div>
    </Card>
  );
}

function ApplicationSettings() {
  return (
    <Card title="Application Settings" description="Tenant-scoped platform settings.">
      <div className="flex flex-wrap gap-2">
        <StatusBadge tone="green">Platform</StatusBadge>
      </div>
    </Card>
  );
}

function signedInTenantUser() {
  const token = getToken("tenant");
  const identity = token ? decodeTokenIdentity(token) : null;
  const email = identity?.email || "user@techmedia.app";
  const name = identity?.name || email.split("@")[0] || "User";
  return {
    email,
    fallback: userInitials(name),
    name,
    permissions: identity?.permissions ?? [],
    tenantRole: identity?.tenantRole ?? "user"
  };
}

function decodeTokenIdentity(token: string) {
  try {
    const encoded = token.split(".")[1];
    if (!encoded) return null;
    const payload = JSON.parse(atob(encoded.replace(/-/g, "+").replace(/_/g, "/"))) as {
      email?: unknown;
      name?: unknown;
      permissions?: unknown;
      tenantRole?: unknown;
    };
    if (typeof payload.email !== "string" || !payload.email.trim()) return null;
    return {
      email: payload.email.trim(),
      name: typeof payload.name === "string" ? payload.name.trim() : "",
      permissions: Array.isArray(payload.permissions)
        ? payload.permissions.filter((value): value is string => typeof value === "string")
        : [],
      tenantRole: typeof payload.tenantRole === "string" ? payload.tenantRole : "user"
    };
  } catch {
    return null;
  }
}

function userInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "U";
}

function renderOwnedLocationPage(page: AppPage) {
  if (page === "core.common.location.countries") return <CountryWorkspace />;
  if (page === "core.common.location.states") return <StateWorkspace />;
  if (page === "core.common.location.districts") return <DistrictWorkspace />;
  if (page === "core.common.location.cities") return <CityWorkspace />;
  if (page === "core.common.location.pincodes") return <PincodeWorkspace />;
  return null;
}

function renderOwnedCommonMasterPage(page: AppPage) {
  if (page === "core.common.accounts.ledger-groups") return <LedgerGroupsWorkspace />;
  if (page === "core.common.accounts.ledgers") return <LedgersWorkspace />;
  if (page === "core.common.contacts.contact-groups") return <ContactGroupsWorkspace />;
  if (page === "core.common.contacts.contact-types") return <ContactTypesWorkspace />;
  if (page === "core.common.contacts.address-types") return <AddressTypesWorkspace />;
  if (page === "core.common.contacts.bank-names") return <BankNamesWorkspace />;
  if (page === "core.common.products.product-groups") return <ProductGroupsWorkspace />;
  if (page === "core.common.products.product-categories") return <ProductCategoriesWorkspace />;
  if (page === "core.common.products.product-types") return <ProductTypesWorkspace />;
  if (page === "core.common.products.units") return <UnitsWorkspace />;
  if (page === "core.common.products.hsn-codes") return <HsnCodesWorkspace />;
  if (page === "core.common.products.taxes") return <TaxesWorkspace />;
  if (page === "core.common.products.brands") return <BrandsWorkspace />;
  if (page === "core.common.products.colours") return <ColoursWorkspace />;
  if (page === "core.common.products.sizes") return <SizesWorkspace />;
  if (page === "core.common.products.styles") return <StylesWorkspace />;
  if (page === "core.common.workorder.work-order-types") return <WorkOrderTypesWorkspace />;
  if (page === "core.common.workorder.transports") return <TransportsWorkspace />;
  if (page === "core.common.workorder.warehouses") return <WarehousesWorkspace />;
  if (page === "core.common.workorder.destinations") return <DestinationsWorkspace />;
  if (page === "core.common.workorder.stock-rejection-types")
    return <StockRejectionTypesWorkspace />;
  if (page === "core.common.others.currencies") return <CurrenciesWorkspace />;
  if (page === "core.common.others.priorities") return <PrioritiesWorkspace />;
  if (page === "core.common.others.payment-terms") return <PaymentTermsWorkspace />;
  if (page === "core.common.others.sales-types") return <SalesTypesWorkspace />;
  if (page === "core.common.others.months") return <MonthsWorkspace />;
  return null;
}

function titleForPage(page: AppPage) {
  const labels: Partial<Record<AppPage, string>> = {
    "application.overview": "Overview",
    "application.landing": "Landing Desk",
    "application.profile": "Application Profile",
    "application.settings": "Application Settings",
    "application.access.users": "Users",
    "application.access.roles": "Roles",
    "application.access.permissions": "Permissions",
    "application.access.user-roles": "User Roles",
    "application.access.role-permissions": "Role Permissions",
    "crm.overview": "Overview",
    "crm.enquiry.assigned": "My Enquiry",
    "crm.enquiry.created": "Enquiry created by me",
    "crm.enquiry.open": "Open Enquiry",
    "frappe.overview": "Overview",
    "frappe.settings": "Settings",
    "core.common.location.cities": "Cities",
    "core.common.location.countries": "Countries",
    "core.common.location.districts": "Districts",
    "core.common.location.pincodes": "Pincodes",
    "core.common.location.states": "States",
    "core.common.contacts.address-types": "Address Types",
    "core.common.contacts.bank-names": "Bank Names",
    "core.common.contacts.contact-groups": "Contact Groups",
    "core.common.contacts.contact-types": "Contact Types",
    "core.common.accounts.ledger-groups": "Ledger Groups",
    "core.common.accounts.ledgers": "Ledgers",
    "core.common.others.currencies": "Currencies",
    "core.common.others.months": "Months",
    "core.common.others.payment-terms": "Payment Terms",
    "core.common.others.priorities": "Priorities",
    "core.common.others.sales-types": "Sales Types",
    "core.common.products.brands": "Brands",
    "core.common.products.colours": "Colours",
    "core.common.products.hsn-codes": "HSN Codes",
    "core.common.products.product-categories": "Product Categories",
    "core.common.products.product-groups": "Product Groups",
    "core.common.products.product-types": "Product Types",
    "core.common.products.sizes": "Sizes",
    "core.common.products.styles": "Styles",
    "core.common.products.taxes": "Taxes",
    "core.common.products.units": "Units",
    "core.common.workorder.destinations": "Destinations",
    "core.common.workorder.stock-rejection-types": "Stock Rejection Types",
    "core.common.workorder.transports": "Transports",
    "core.common.workorder.warehouses": "Warehouses",
    "core.common.workorder.work-order-types": "Work Order Types",
    "core.organisation.company": "Company",
    "core.organisation.financial-year": "Financial Years",
    "core.organisation.default-company": "Default Company",
    "core.master.contact": "Contact",
    "core.master.product": "Product",
    "core.master.work-order": "Work Order"
  };
  return labels[page] ?? "Application";
}

function isCommonMasterPage(page: string): page is AppPage {
  return COMMON_MASTER_PAGES.has(page);
}

const COMMON_MASTER_PAGES = new Set<string>([
  "core.common.accounts.ledger-groups",
  "core.common.accounts.ledgers",
  "core.common.contacts.address-types",
  "core.common.contacts.bank-names",
  "core.common.contacts.contact-groups",
  "core.common.contacts.contact-types",
  "core.common.others.currencies",
  "core.common.others.months",
  "core.common.others.payment-terms",
  "core.common.others.priorities",
  "core.common.others.sales-types",
  "core.common.products.brands",
  "core.common.products.colours",
  "core.common.products.hsn-codes",
  "core.common.products.product-categories",
  "core.common.products.product-groups",
  "core.common.products.product-types",
  "core.common.products.sizes",
  "core.common.products.styles",
  "core.common.products.taxes",
  "core.common.products.units",
  "core.common.workorder.destinations",
  "core.common.workorder.stock-rejection-types",
  "core.common.workorder.transports",
  "core.common.workorder.warehouses",
  "core.common.workorder.work-order-types"
]);

function appFromPage(
  page: AppPage,
  _landingApp: PlatformAppId,
  _enabledApps: PlatformAppId[]
): PlatformAppId {
  if (page.startsWith("crm")) return "crm";
  if (page.startsWith("frappe")) return "frappe";
  if (page.startsWith("core")) return "application";
  return "application";
}

function pageForApp(app: PlatformAppId, _permissions: string[]): AppPage {
  if (app === "application") return "application.overview";
  if (app === "frappe") return "frappe.overview";
  return "crm.overview";
}

function isAppRootPath() {
  return window.location.pathname === "/app" || window.location.pathname === "/app/";
}

function readPublishedLandingApp(): PlatformAppId | null {
  try {
    const stored = window.localStorage.getItem(LANDING_APP_STORAGE_KEY);
    return stored === "application" || stored === "crm" || stored === "frappe" ? stored : null;
  } catch {
    return null;
  }
}

function accessibleApps(
  apps: PlatformAppId[],
  user: { permissions: string[]; tenantRole: string }
) {
  const canUseCrm = user.permissions.some((permission) => permission.startsWith("crm.enquiry."));
  const canUseFrappe = user.permissions.some((permission) =>
    permission.startsWith("frappe.connection.")
  );
  return apps.filter(
    (app) =>
      (app === "application" && user.tenantRole === "admin") ||
      (app === "crm" && canUseCrm) ||
      (app === "frappe" && canUseFrappe)
  );
}

function pageAllowed(
  page: AppPage,
  user: { permissions: string[]; tenantRole: string },
  apps: PlatformAppId[]
) {
  if (page.startsWith("application") || page.startsWith("core")) {
    return user.tenantRole === "admin" && apps.includes("application");
  }
  if (page.startsWith("frappe")) {
    return apps.includes("frappe") && user.permissions.includes("frappe.connection.view");
  }
  if (!apps.includes("crm")) return false;
  if (page === "crm.overview") {
    return user.permissions.some((permission) => permission.startsWith("crm.enquiry."));
  }
  const permission =
    page === "crm.enquiry.assigned"
      ? "crm.enquiry.assigned.view"
      : page === "crm.enquiry.created"
        ? "crm.enquiry.created.view"
        : "crm.enquiry.open.view";
  return user.permissions.includes(permission);
}
