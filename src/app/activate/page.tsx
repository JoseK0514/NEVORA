import Link from "next/link";
import { activateAccountAction } from "@/app/activate/actions";

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; employeeId?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark large">F</span>
          <div>
            <p className="eyebrow">Fuel Coffee Drive</p>
            <h1>Activate Account</h1>
          </div>
        </div>

        {params.error ? (
          <p className="form-error">
            {params.error === "not_found"
              ? "We could not activate that account. Check the Employee ID and phone number, or the account may already be activated."
              : "Enter your Employee ID and phone number, and choose a matching password of at least 8 characters."}
          </p>
        ) : null}

        <form action={activateAccountAction} className="form-stack">
          <label>
            Employee ID
            <input
              name="employeeId"
              placeholder="JN-001"
              defaultValue={params.employeeId ?? ""}
              autoComplete="username"
              required
            />
          </label>
          <label>
            Phone Number
            <input name="phone" inputMode="tel" autoComplete="tel" required />
          </label>
          <label>
            Create Password
            <input
              name="password"
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
            />
          </label>
          <label>
            Confirm Password
            <input
              name="confirmPassword"
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
            />
          </label>
          <button type="submit" className="button primary full">Activate Account</button>
        </form>

        <div className="auth-secondary">
          <span>Already activated?</span>
          <Link href="/login">Back to Sign In</Link>
        </div>
      </section>
    </main>
  );
}
