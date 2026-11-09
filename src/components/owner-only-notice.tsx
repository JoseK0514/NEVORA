import { CorpButtonLink, CorpEmpty, CorpNav, CorpPage, CorpTitle } from "./corp/corp";

/** PD9 / UX10: an Owner-only page opened by someone else (a shared link, a bookmark) says why it is closed and who can
 * help, in place of a silent move to Home. Permissions are unchanged: nothing on the page is read or shown.
 * Round 4 (Nov 7, 2026): drawn on the corporate kit like Help, so Direction B gives it the same hero (phones) and band
 * (desktop) as every other page, instead of the older white box. */
export function OwnerOnlyNotice({ title, reason, help = "Ask an Owner if you need a change here." }: { title: string; reason: string; help?: string }) {
  return <CorpPage className="c-page--narrow cm-owner-only" labelledBy="owner-only-title">
    <CorpNav back={{ href: "/app", label: "Home" }} title={title} titleId="owner-only-nav-title" phoneOnly />
    <CorpTitle id="owner-only-title" title={title} />
    <CorpEmpty label={title} title={reason} body={help} action={<CorpButtonLink href="/app" kind="secondary">Back to Home</CorpButtonLink>} />
  </CorpPage>;
}
