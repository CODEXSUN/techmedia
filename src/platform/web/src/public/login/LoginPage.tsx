import { Button } from "@codexsun/ui/components/button";
import { Field } from "@codexsun/ui/components/Field";
import { GlobalLoader } from "@codexsun/ui/components/global-loader";
import { useNavigate } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import {
  apiGet,
  clearToken,
  developmentLogin,
  login,
  tokenIsCurrent
} from "../../shared/api/platform-api";
import { TechMediaAuthLayout } from "./TechMediaAuthLayout";
import { TechMediaLandingLayout } from "./TechMediaLandingLayout";

export function LoginPage() {
  return <LoginSurface landing={false} />;
}

export function LandingLoginPage() {
  return <LoginSurface landing />;
}

function LoginSurface({ landing }: { landing: boolean }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const autoLoginStarted = useRef(false);

  useEffect(() => {
    if (!tokenIsCurrent()) {
      clearToken();
      setSessionChecked(true);
      return;
    }
    let cancelled = false;
    void apiGet<{ authenticated: boolean }>("/auth/session")
      .then((session) => {
        if (cancelled) return;
        if (session.authenticated) {
          void navigate({ replace: true, to: "/app/crm/overview" });
          return;
        }
        clearToken();
        setSessionChecked(true);
      })
      .catch(() => {
        if (cancelled) return;
        clearToken();
        setSessionChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    if (
      !sessionChecked ||
      !import.meta.env.DEV ||
      import.meta.env.VITE_DEV_AUTO_LOGIN !== "1" ||
      autoLoginStarted.current
    ) {
      return;
    }
    autoLoginStarted.current = true;
    setLoading(true);
    void developmentLogin()
      .then((result) => {
        if (result.success) void navigate({ replace: true, to: "/app/crm/overview" });
        else setMessage(result.error.message);
      })
      .finally(() => setLoading(false));
  }, [navigate, sessionChecked]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const result = await login({ email, password });
    if (result.success) void navigate({ replace: true, to: "/app/crm/overview" });
    else setMessage(result.error.message);
    setLoading(false);
  }

  if (!sessionChecked) return <GlobalLoader />;

  const form = (
    <form className="auth-form" onSubmit={submit}>
      <Field
        autoComplete="email"
        className="auth-field"
        label="Email"
        name="email"
        disabled={loading}
        onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
        type="email"
        value={email}
      />
      <Field
        autoComplete="current-password"
        className="auth-field"
        label="Password"
        name="password"
        disabled={loading}
        onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
        type="password"
        value={password}
      />
      {message ? <p className="form-error">{message}</p> : null}
      <Button
        className={landing ? "auth-submit" : undefined}
        disabled={loading}
        icon={<LogIn size={16} />}
        type="submit"
      >
        {loading ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );

  return landing ? (
    <TechMediaLandingLayout>{form}</TechMediaLandingLayout>
  ) : (
    <TechMediaAuthLayout surface="app" title="TechMedia Login">
      {form}
    </TechMediaAuthLayout>
  );
}
