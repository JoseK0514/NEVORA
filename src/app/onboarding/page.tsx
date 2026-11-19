import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AUTH_COPY } from "@/lib/auth-copy";
import { readAuthLang } from "@/lib/auth-lang.server";
import { QuietAuthShell } from "@/components/auth-premium/auth-shell";
import { SignupHeader } from "@/components/onboarding/signup-ui";
import { SIGNUP_COPY, fill } from "@/lib/onboarding/signup-copy";
import { onSignupHost, readSignupPage } from "@/lib/onboarding/signup-page.server";
import { SignupForm } from "./signup-form";
import "../login/auth-premium.css";
import "../login/auth-signature.css";

export const dynamic = "force-dynamic";
/** The tab names the step in the page's language (WCAG 2.4.2). */
export async function generateMetadata(): Promise<Metadata> {
  return { title: `${SIGNUP_COPY[await readAuthLang()].meta.signup} · NEVORA`, robots: { index: false, follow: false } };
}

/** Signup on the configured signup origin (SCRUM-190). Public signup stays closed unless admission is explicitly open;
 * see readSignupPage for the private staging test. Other hosts get not-found. */
export default async function SignupPage() {
  if (!onSignupHost((await headers()).get("host"))) notFound();
  const [lang, page] = [await readAuthLang(), readSignupPage()];
  const t = SIGNUP_COPY[lang], s = t.signup;
  return <QuietAuthShell lang={lang} t={AUTH_COPY[lang]} footerHelp={false}>
    {page.mode === "closed"
      ? <><SignupHeader title={s.closedTitle} sub={fill(s.closedBody, { support: t.support })} /></>
      : <SignupForm lang={lang} mode={page.mode} termsVersion={page.termsVersion} privacyVersion={page.privacyVersion} />}
  </QuietAuthShell>;
}
