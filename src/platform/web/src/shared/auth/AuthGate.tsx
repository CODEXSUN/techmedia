import { useNavigate } from "@tanstack/react-router";
import { Button } from "@codexsun/ui/components/button";
import { Card } from "@codexsun/ui/components/card";
import { GlobalLoader } from "@codexsun/ui/components/global-loader";
import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { apiGet, getToken } from "../api/platform-api";

function tokenIsCurrent(token: string | null) {
  if (!token) return false;
  try {
    const encoded = token.split(".")[1];
    if (!encoded) return false;
    const claims = JSON.parse(atob(encoded.replace(/-/g, "+").replace(/_/g, "/"))) as {
      exp?: number;
    };
    return typeof claims.exp === "number" && claims.exp * 1000 >= Date.now();
  } catch {
    return false;
  }
}

export function AuthGate({ children }: { children: ReactElement }) {
  const navigate = useNavigate();
  const localValid = useMemo(() => tokenIsCurrent(getToken()), []);
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

  if (serverValid === true) return children;
  if (serverValid === null) return <GlobalLoader />;
  return (
    <main className="simple-page">
      <Card title="Login required">
        <p style={{ marginBottom: "1.5rem" }}>Sign in to use TechMedia.</p>
        <Button style={{ width: "100%" }} onClick={() => navigate({ to: "/login" })}>
          Go to Login
        </Button>
      </Card>
    </main>
  );
}
