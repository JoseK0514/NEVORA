import Link from "next/link";
import { login } from "@/app/login/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; activated?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark large">F</span>
          <div>
            <p className="eyebrow">Fuel Coffee Drive</p>
            <h1>Employee Scheduling</h1>
          </div>
        </div>

        {params.error ? (
          <p className="form-error">Employee ID or password is incorrect.</p>
        ) : null}
        {params.activated ? (
          <p className="form-success">Account activated. You can sign in now.</p>
        ) : null}

        <form action={login} className="form-stack">
          <label>
            Employee ID
            <input name="employeeId" placeholder="JN-001" autoComplete="username" required />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </label>
          <button type="submit" className="button primary full">Sign In</button>
        </form>

        <div className="auth-secondary">
          <span>First time here?</span>
          <Link href="/activate">Activate Account</Link>
        </div>
      </section>
    </main>
  );
}
