import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getTenantPublicPortal, type TenantPublicPortal } from "../../modules/tenant-portal";
import { fallbackTenantPortal } from "./tenant-site.defaults";

type TenantSiteContextValue = {
  loading: boolean;
  portal: TenantPublicPortal;
};

const TenantSiteContext = createContext<TenantSiteContextValue | null>(null);

let cachedPortal: TenantPublicPortal | null = null;
let portalRequest: Promise<TenantPublicPortal> | null = null;

function loadTenantPortal() {
  if (cachedPortal) return Promise.resolve(cachedPortal);
  portalRequest ??= getTenantPublicPortal()
    .then((portal) => {
      const publicPortal = portal.configured
        ? portal
        : { ...portal, brandName: fallbackTenantPortal.brandName };
      cachedPortal = publicPortal;
      return publicPortal;
    })
    .finally(() => {
      portalRequest = null;
    });
  return portalRequest;
}

export function TenantSiteProvider({
  children,
  pageTitle
}: {
  children: ReactNode;
  pageTitle?: string | undefined;
}) {
  const [portal, setPortal] = useState(cachedPortal ?? fallbackTenantPortal);
  const [loading, setLoading] = useState(cachedPortal === null);

  useEffect(() => {
    let active = true;
    void loadTenantPortal()
      .then((nextPortal) => {
        if (active) setPortal(nextPortal);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    document.title = pageTitle
      ? `${pageTitle} | ${portal.brandName}`
      : `${portal.brandName} | Computer Hardware & LogicX Software`;
  }, [pageTitle, portal.brandName]);

  const value = useMemo(() => ({ loading, portal }), [loading, portal]);

  return <TenantSiteContext.Provider value={value}>{children}</TenantSiteContext.Provider>;
}

export function useTenantSite() {
  const context = useContext(TenantSiteContext);
  if (!context) throw new Error("useTenantSite must be used inside TenantSiteProvider.");
  return context;
}
