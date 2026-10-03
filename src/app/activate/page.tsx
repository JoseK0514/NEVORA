import Link from "next/link";
import { safeReturnTo } from "@/lib/notifications/destinations";
import { BrandMark } from "@/components/brand-mark";
import { PhoneInput } from "@/components/phone-input";
import { activateAccountAction } from "@/app/activate/actions";
import { NUVORA_BRAND } from "../../lib/brand";

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; employeeId?: string; returnTo?: string | string[] }>;
}) {
  const params = await searchParams;
  const returnTo = typeof params.returnTo === "string" ? safeReturnTo(params.returnTo) : null;
  const returnQuery = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <BrandMark large />
          <div>
            <p className="eyebrow">{NUVORA_BRAND.platform} · {NUVORA_BRAND.module}</p>
            <h1>Activate Account</h1>
            <p className="auth-workspace">{NUVORA_BRAND.workspace}</p>
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
            {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
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
            <PhoneInput name="phone" autoComplete="tel" required />
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
          <Link href={`/login${returnQuery}`}>Back to Sign In</Link>
        </div>
      </section>
    </main>
  );
}
