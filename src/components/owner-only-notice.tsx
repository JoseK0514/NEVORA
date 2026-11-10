import { CorpButtonLink, CorpEmpty, CorpNav, CorpPage, CorpTitle } from "./corp/corp";
import { BCard, BHero, BScreen, BStack, BState } from "./owner-b/b-kit";

/** "Jose Natal" or "Jose Natal or Ana Colon" (at most two names, then "an Owner"). */
export function ownerNames(names: string[]) {
  const shown = names.filter(Boolean).slice(0, 2);
  return shown.length ? shown.join(" or ") : null;
}

/** PD9 / UX10: a page closed to this person (a shared link, a bookmark) says why it is closed and who can help, in place of
 * a silent move. Permissions are unchanged: nothing on the page is read or shown.
 * Review B2 (NV-136, NV-137): every closed page uses this notice. A lock in a grey circle, the reason as the title, who can
 * help ("Jose Natal can give you payroll access.") and one way forward: the page that does the job for this role when there
 * is one, otherwise Home on desktop (phones have the band's "‹ Home"). */
export function OwnerOnlyNotice({ title, reason, help = "Ask an Owner if you need a change here.", owners = [], ownersCan, next }: {
  title: string; reason: string; help?: string;
  /** The workspace's Owners, to name who can help. */
  owners?: string[];
  /** What the named Owners can do, e.g. "give you payroll access"; with names, it replaces `help`. */
  ownersCan?: string;
  /** Where this person does the job instead ("Your team's requests are in Things to do"). */
  next?: { href: string; label: string };
}) {
  const named = ownerNames(owners);
  const line = named && ownersCan ? `${named} can ${ownersCan}.` : help;
  return <CorpPage className="c-page--narrow cm-owner-only" labelledBy="owner-only-title">
    <BScreen back>
      <BHero title={title} back={{ href: "/app", label: "Home" }} />
      <BStack><BCard><BState kind="locked" title={reason} line={line} action={next ? { label: next.label, href: next.href } : undefined} /></BCard></BStack>
    </BScreen>
    <CorpNav back={{ href: "/app", label: "Home" }} title={title} titleId="owner-only-nav-title" phoneOnly />
    <CorpTitle id="owner-only-title" title={title} />
    <CorpEmpty label={title} title={reason} body={line} action={<CorpButtonLink href={next?.href ?? "/app"} kind={next ? "primary" : "secondary"}>{next?.label ?? "Back to Home"}</CorpButtonLink>} />
  </CorpPage>;
}
