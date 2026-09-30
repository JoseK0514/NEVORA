import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { login } from "@/app/login/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; activated?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="auth-page employee-login-page">
      <div className="employee-login-overlay" aria-hidden="true" />
      <div className="employee-login-scene-copy" aria-hidden="true">
        <span>GOOD PEOPLE</span>
        <strong>GREAT COFFEE</strong>
      </div>

      <div className="employee-login-shell">
        <header className="employee-login-brand">
          <BrandMark large />
          <div>
            <strong>Fuel Coffee Drive</strong>
            <span>Employee Portal</span>
          </div>
        </header>

        <section className="auth-card employee-login-card">
          <div className="employee-login-heading">
            <p className="eyebrow">EMPLOYEE PORTAL</p>
            <h1>Employee Login</h1>
            <p>
              Access your schedule, availability, requests, time, and profile.
            </p>
          </div>

          {params.error ? (
            <p className="form-error">Employee ID or password is incorrect.</p>
          ) : null}
          {params.activated ? (
            <p className="form-success">Account activated. You can sign in now.</p>
          ) : null}

          <form action={login} className="form-stack employee-login-form">
            <label>
              Employee ID
              <input
                name="employeeId"
                placeholder="Enter your employee ID"
                autoComplete="username"
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
                required
              />
            </label>
            <button type="submit" className="button primary full employee-login-submit">
              Sign In
            </button>
          </form>

          <div className="auth-secondary employee-login-secondary">
            <span>New employee?</span>
            <Link href="/activate">Activate Account</Link>
          </div>
        </section>

        <footer className="employee-login-footer">
          <span>Fuel Coffee Drive • Employee Portal</span>
          <small>People fuel possibility.</small>
        </footer>
      </div>
    </main>
  );
}
