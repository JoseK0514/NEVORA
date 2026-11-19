import type { Metadata } from "next";
import { AUTH_COPY } from "@/lib/auth-copy";
import { readAuthLang } from "@/lib/auth-lang.server";
import { getPublicWorkspaceName } from "@/lib/data/workspaces";
import { QuietAuthShell } from "@/components/auth-premium/auth-shell";
import { signupResumeUrl } from "@/lib/onboarding/signup-page.server";
import { OwnerActivation } from "./owner-activation";
import "../../login/auth-premium.css";
import "../../login/auth-signature.css";
import "../../activate/activation.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "NEVORA", robots: { index: false, follow: false }, referrer: "no-referrer" };

/** Initial Owner password on the new workplace's host (SCRUM-190). The server binds the proof to this exact host and
 * workplace; this page only collects the password and follows the activation contract. */
export default async function OwnerActivationPage() {
  const [lang, workspaceName] = await Promise.all([readAuthLang(), getPublicWorkspaceName()]);
  return <QuietAuthShell lang={lang} t={AUTH_COPY[lang]} footerHelp={false}>
    <OwnerActivation lang={lang} workspaceName={workspaceName} signupResumeUrl={signupResumeUrl()} />
  </QuietAuthShell>;
}
