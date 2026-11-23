import { CorpButtonLink, CorpEmpty, CorpNav, CorpPage, CorpTitle } from "./corp/corp";
import Link from "next/link";
import type { ReactNode } from "react";
import { BButtonLink, BCard, BGlyph, BHero, BScreen, BStack, BState, BStateScreen } from "./owner-b/b-kit";
import { ClosedSettingsTitle } from "./owner-only-title";

/** "Jose Natal" or "Jose Natal or Ana Colon" (at most two names, then "an Owner"). */
export function ownerNames(names: string[]) {
  const shown = names.filter(Boolean).slice(0, 2);
  return shown.length ? shown.join(" or ") : null;
}

/** Review Nov 11 (MG-002): what a Manager reads on the closed Payroll page. Their part of the job is Timecards, and their
 * own pay is one tap away; each is offered only when the Manager's navigation has it (the rule More and the shell use).
 * `who` is ownerNames(): "Jose Natal", or null when no Owner's name could be read. */
export function closedPayrollForManager(has: (href: string) => boolean, who: string | null) {
  const timecards = has("/app/timecards");
  return {
    line: timecards ? `Your part is timecards. ${who ?? "An Owner"} runs payroll after you approve them.` : who ? `${who} can give you payroll access.` : "Owners can give you payroll access.",
    next: timecards ? { href: "/app/timecards", label: "Open Timecards" } : undefined,
    also: has("/app/my-pay") ? { href: "/app/my-pay", label: "See my pay" } : undefined,
  };
}

/** PD9 / UX10: a page closed to this person (a shared link, a bookmark) says why it is closed and who can help, in place of
 * a silent move. Permissions are unchanged: nothing on the page is read or shown.
 * Review B2 (NV-136, NV-137): every closed page uses this notice. A lock in a grey circle, the reason as the title, who can
 * help ("Jose Natal can give you payroll access.") and one way forward: the page that does the job for this role when there
 * is one, otherwise Home on desktop (phones have the band's "‹ Home"). */
export function OwnerOnlyNotice({ title, reason, help = "Ask an Owner if you need a change here.", owners = [], ownersCan, next, line: ownLine, also, state = false, info = false, back }: {
  /** `reason` is left out when the title already is the reason (/app/restricted): the card then holds the help line alone. */
  title: string; reason?: string; help?: string;
  /** The workspace's Owners, to name who can help. */
  owners?: string[];
  /** What the named Owners can do, e.g. "give you payroll access"; with names, it replaces `help`. */
  ownersCan?: string;
  /** Where this person does the job instead ("Your team's requests are in Things to do"). */
  next?: { href: string; label: string };
  /** The card's sentence when the page writes its own (it then replaces `help` and `ownersCan`). */
  line?: ReactNode;
  /** A second, quieter way on, as a text link after `next` ("See my pay"). */
  also?: { href: string; label: string };
  /** Phase 3 (MG-002, MG-015): the pages closed to a Manager are the one Direction B state screen at every width (the band
   * with "‹ Home" and the title, then one card: the lock in its 48px circle, the reason, the sentence and the way on as a
   * tinted pill, never a second filled button). Without it the notice is drawn as before, so an Employee's closed pages
   * are unchanged. */
  state?: boolean;
  /** Review 30 (D19): the page is closed by a rule of the place (Christmas bonus hours outside Puerto Rico), not by this
   * person's access, so the card shows the information glyph, not the lock. */
  info?: boolean;
  /** The band's way back when it is not Home ("‹ Insights"). */
  back?: { href: string; label: string };
}) {
  const named = ownerNames(owners);
  const line = ownLine ?? (named && ownersCan ? `${named} can ${ownersCan}.` : help);
  // Final verification F (F09): every closed page has one tinted step (DESIGN.MD Phase 3). Without a page that does the
  // job for this person, the step is Home, as on the pages closed for company-wide access; a Manager limited to one
  // location met a dead end on a closed Settings page. A closed Settings page also names itself on the band.
  const step = next ?? { href: "/app", label: "Return to Home" };
  if (state) return <CorpPage className="c-page--narrow cm-owner-only c-route-state--checking" labelledBy="owner-only-title">
    <BStateScreen title={title === "Settings" ? <ClosedSettingsTitle /> : title} titleId="owner-only-title" back={back ?? { href: "/app", label: "Home" }}>
      <BState kind="locked" icon={info ? <BGlyph meaning="info" /> : undefined} title={reason} line={line}>
        <div className="b-state-actions b-closed-actions">
          <BButtonLink href={step.href} kind="ghost">{step.label}</BButtonLink>
          {also ? <Link className="b-closed-also" href={also.href}>{also.label}</Link> : null}
        </div>
      </BState>
    </BStateScreen>
  </CorpPage>;
  return <CorpPage className="c-page--narrow cm-owner-only" labelledBy="owner-only-title">
    <BScreen back>
      <BHero title={title} back={back ?? { href: "/app", label: "Home" }} />
      <BStack><BCard><BState kind="locked" title={reason} line={line} action={next ? { label: next.label, href: next.href } : undefined} /></BCard></BStack>
    </BScreen>
    <CorpNav back={back ?? { href: "/app", label: "Home" }} title={title} titleId="owner-only-nav-title" phoneOnly />
    <CorpTitle id="owner-only-title" title={title} />
    <CorpEmpty label={title} title={reason ?? line} body={reason ? line : undefined} action={<CorpButtonLink href={next?.href ?? "/app"} kind={next ? "primary" : "secondary"}>{next?.label ?? "Back to Home"}</CorpButtonLink>} />
  </CorpPage>;
}
