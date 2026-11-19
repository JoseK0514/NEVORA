import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AUTH_COPY, isAuthLang } from "@/lib/auth-copy";
import { readAuthLang } from "@/lib/auth-lang.server";
import { QuietAuthShell } from "@/components/auth-premium/auth-shell";
import { onSignupHost, signupPortalDomain } from "@/lib/onboarding/signup-page.server";
import { VerifyJourney } from "./verify-journey";
import "../../login/auth-premium.css";
import "../../login/auth-signature.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "NEVORA", robots: { index: false, follow: false }, referrer: "no-referrer" };

/** The verification email's destination: `/onboarding/verify?lang=en|es#proof=…` on the signup origin (SCRUM-190).
 * The link's language wins over the saved one for this visit; the page saves it as the sign-in language too. Opening
 * the page without a link resumes a verified signup from its cookie. */
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ lang?: string | string[] }> }) {
  if (!onSignupHost((await headers()).get("host"))) notFound();
  const requested = (await searchParams).lang;
  const lang = typeof requested === "string" && isAuthLang(requested) ? requested : await readAuthLang();
  return <QuietAuthShell lang={lang} t={AUTH_COPY[lang]} footerHelp={false}>
    <VerifyJourney lang={lang} portalBaseDomain={signupPortalDomain()} />
  </QuietAuthShell>;
}
