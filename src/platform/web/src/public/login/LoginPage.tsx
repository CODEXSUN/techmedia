import { Button } from "@codexsun/ui/components/button";
import { Field } from "@codexsun/ui/components/Field";
import { LogIn } from "lucide-react";
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { developmentLogin, login } from "../../shared/api/platform-api";
import { TechMediaAuthLayout } from "./TechMediaAuthLayout";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const autoLoginStarted = useRef(false);

  useEffect(() => {
    if (
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
        if (result.success) window.location.assign("/app/");
        else setMessage(result.error.message);
      })
      .finally(() => setLoading(false));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const result = await login({ email, password });
    if (result.success) window.location.assign("/app/");
    else setMessage(result.error.message);
    setLoading(false);
  }

  return (
    <TechMediaAuthLayout surface="app" title="TechMedia Login">
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
        <Button disabled={loading} icon={<LogIn size={16} />} type="submit">
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </TechMediaAuthLayout>
  );
}
