import Link from "next/link";
import { getPublicWorkspaceName } from "@/lib/data/workspaces";
import { safeReturnTo } from "@/lib/notifications/destinations";
import { BrandLockup } from "@/components/brand-lockup";
import { BrandLegal } from "@/components/brand-legal";
import { login } from "@/app/login/actions";
import { NUVORA_BRAND } from "../../lib/brand";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import { KeyIcon } from "@phosphor-icons/react/dist/ssr/Key";
import { UserPlusIcon } from "@phosphor-icons/react/dist/ssr/UserPlus";
import { LoginVisual } from "./login-visual";
import { LoginSubmit } from "./login-submit";
import "./login.css";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; activated?: string; returnTo?: string | string[] }>;
}) {
  const params = await searchParams;
  const workspaceName = await getPublicWorkspaceName();
  const returnTo = typeof params.returnTo === "string" ? safeReturnTo(params.returnTo) : null;
  const returnQuery = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";

  return (
    <main className="auth-page employee-login-page">
      <div className="employee-login-shell">
        <header className="employee-login-brand">
          <BrandLockup variant="large" />
          <span className="login-workspace">{workspaceName ?? "Workspace unavailable"}</span>
        </header>

        <div className="employee-login-composition">
        <LoginVisual />
        <section className="auth-card employee-login-card">
          <div className="employee-login-heading">
            <h1>Employee Login</h1>
            <p>
              Access your schedule, availability, requests, time, and profile.
            </p>
          </div>

          {params.error ? (
            <p className="form-error" id="login-error" role="alert">Employee ID or password is incorrect.</p>
          ) : null}
          {params.activated ? (
            <p className="form-success" role="status">Account activated. You can sign in now.</p>
          ) : null}

          <form action={login} className="form-stack employee-login-form">
            {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
            <label>
              Employee ID
              <input
                name="employeeId"
                placeholder="Enter your employee ID"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                aria-describedby={params.error ? "login-error" : undefined}
                required
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                aria-describedby={params.error ? "login-error" : undefined}
                required
              />
            </label>
            <LoginSubmit />
          </form>

          <div className="auth-secondary employee-login-secondary">
            <Link href="/forgot-access" className="login-access-link">
              <KeyIcon size={20} weight="regular" aria-hidden="true" focusable="false" />
              <span>Forgot access?</span>
              <ArrowUpRightIcon size={16} weight="regular" aria-hidden="true" focusable="false" />
            </Link>
            <Link href={`/activate${returnQuery}`} className="login-access-link">
              <UserPlusIcon size={20} weight="regular" aria-hidden="true" focusable="false" />
              <span><small>New employee?</small>Activate your account</span>
              <ArrowUpRightIcon size={16} weight="regular" aria-hidden="true" focusable="false" />
            </Link>
          </div>
        </section>
        </div>

        <footer className="employee-login-footer">
          <small>{NUVORA_BRAND.poweredBy}</small>
          <BrandLegal />
        </footer>
      </div>
    </main>
  );
}
