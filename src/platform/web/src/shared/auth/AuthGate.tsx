import { useNavigate } from "@tanstack/react-router";
import { GlobalLoader } from "@codexsun/ui/components/global-loader";
import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { apiGet, clearToken, tokenIsCurrent } from "../api/platform-api";

export function AuthGate({ children }: { children: ReactElement }) {
  const navigate = useNavigate();
  const localValid = useMemo(() => tokenIsCurrent(), []);
  const [serverValid, setServerValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!localValid) {
      setServerValid(false);
      return;
    }
    let cancelled = false;
    void apiGet<{ authenticated: boolean }>("/auth/session")
      .then((session) => !cancelled && setServerValid(session.authenticated))
      .catch(() => !cancelled && setServerValid(false));
    return () => {
      cancelled = true;
    };
  }, [localValid]);

  useEffect(() => {
    if (serverValid !== false) return;
    clearToken();
    void navigate({ replace: true, to: "/login" });
  }, [navigate, serverValid]);

  if (serverValid === true) return children;
  return <GlobalLoader />;
}
