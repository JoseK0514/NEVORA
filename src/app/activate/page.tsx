import { getPublicWorkspaceName } from "@/lib/data/workspaces";
import { safeReturnTo } from "@/lib/notifications/destinations";
import { BrandLockup } from "@/components/brand-lockup";
import { BrandLegal } from "@/components/brand-legal";
import { NUVORA_BRAND } from "@/lib/brand";
import { ActivationInvitation } from "./activation-invitation";
import { ActivationVisual } from "./activation-visual";
import "../login/login.css";
import "./activation.css";

export default async function ActivatePage({ searchParams }: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const params = await searchParams;
  const workspaceName = await getPublicWorkspaceName();
  const returnTo = typeof params.returnTo === "string" ? safeReturnTo(params.returnTo) : null;


  return <main className="auth-page employee-login-page activation-page">
    <div className="employee-login-shell">
      <header className="employee-login-brand">
        <BrandLockup variant="large" />
        <span className="login-workspace">{workspaceName ?? "Workspace unavailable"}</span>
      </header>
      <div className="employee-login-composition">
        <ActivationVisual />
        <section className="auth-card employee-login-card activation-card">
          <div className="employee-login-heading">
            <h1>Activate account</h1>
            <p>Open your email invitation, then choose a password.</p>
          </div>
          <ActivationInvitation loginHref={`/login?activated=1${returnTo?`&returnTo=${encodeURIComponent(returnTo)}`:''}`} />
        </section>
      </div>
      <footer className="employee-login-footer"><small>{NUVORA_BRAND.poweredBy}</small><BrandLegal /></footer>
    </div>
  </main>;
}
