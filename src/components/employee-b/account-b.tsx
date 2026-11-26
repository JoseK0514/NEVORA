import Link from 'next/link';
import type {CSSProperties, ReactNode} from 'react';
import {UserCheckIcon} from '@phosphor-icons/react/dist/ssr/UserCheck';
import {BellIcon} from '@phosphor-icons/react/dist/ssr/Bell';
import {MegaphoneIcon} from '@phosphor-icons/react/dist/ssr/Megaphone';
import {CalendarPlusIcon} from '@phosphor-icons/react/dist/ssr/CalendarPlus';
import {ShieldCheckIcon} from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {EnvelopeSimpleIcon} from '@phosphor-icons/react/dist/ssr/EnvelopeSimple';
import {KeyIcon} from '@phosphor-icons/react/dist/ssr/Key';
import {QuestionIcon} from '@phosphor-icons/react/dist/ssr/Question';
import {FlagIcon} from '@phosphor-icons/react/dist/ssr/Flag';
import {ScalesIcon} from '@phosphor-icons/react/dist/ssr/Scales';
import {TrashIcon} from '@phosphor-icons/react/dist/ssr/Trash';
import {SignOutIcon} from '@phosphor-icons/react/dist/ssr/SignOut';
import {BButtonLink, BCallout, BCard, BEmail, BHero, BIcon, BList, BRow, BScreen, BStack, initialsOf} from '../owner-b/b-kit';
import {PortalSignout} from '../portal-signout';
import {BlockView, shortTitle} from '../legal/legal-document';
import type {Block, PolicyDocument} from '../../lib/legal/policies';
import {NoHeaderActions} from './account-host';
import {Dotted} from './parts';
import {accountCopy, type AccountCopy, type AccountLang} from './account-copy';
import './account.css';

/* Employee phones, Direction B, the Account group (Jose approved the mock "Employee mobile, Direction B", Nov 6, 2026):
 * More, Help and the policy documents. Server-safe pieces (no hooks or handlers); the screens that hold a read or a
 * command live in account-b-client.tsx. Presentation only: each page passes the values, links and actions it already
 * has, and the corporate layout beside it stays what tablets and desktop show. */

const grey = (icon: ReactNode) => <BIcon tone="grey">{icon}</BIcon>;
/** "We aim to respond within two business days." from the policy's longer reply-time text. */
const firstSentence = (text: string) => text.trim().match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text.trim();

/** More (board E-More): your face, name and places on glass with Profile and settings under them, then Your work, Help
 * and legal, and Sign out on its own. Only places the company has switched on; values are the page's own reads. */
export function EmployeeMoreB({name, place, availability, has, count, lang = 'en'}: {
  name: string; place: string; availability: string | null; count: ReactNode;
  has: {availability: boolean; notifications: boolean; updates: boolean};
  /** The person's language (server-safe screen: the page passes it). */ lang?: AccountLang;
}) {
  const copy = accountCopy(lang), t = copy.more, c = copy.common;
  return <BScreen back>
    <NoHeaderActions />
    <BHero back={{href: '/app', label: c.home}} title={t.title} titleId="b-more-title">
      <div className="eb-id b-glass">
        {/* Review B6 (NV-105): you are drawn as in the header (white circle, teal initials); the six tints are for other people. */}
        <div className="eb-id__me"><span className="b-av eb-me" style={{'--s': '48px'} as CSSProperties} aria-hidden="true">{initialsOf(name)}</span><span className="eb-id__tx"><b>{name}</b>{place ? <span><Dotted text={place} /></span> : null}</span></div>
        <Link className="eb-id__link" href="/app/profile" aria-label={t.profileLabel(name)}>{t.profileLink}<CaretRightIcon size={18} weight="bold" aria-hidden="true" /></Link>
      </div>
    </BHero>
    <BStack>
      <BCard title={t.yourWork} id="b-more-work">
        <BList>
          {/* Final review C (row 4): Availability is UserCheck, the navigation's glyph, on every Employee screen. */}
          {has.availability ? <BRow href="/app/availability" lead={grey(<UserCheckIcon weight="bold" />)} title={t.availability} sub={availability ?? undefined} /> : null}
          {has.notifications ? <BRow href="/app/notifications" lead={grey(<BellIcon weight="bold" />)} title={c.notifications} chip={count} sub={t.notificationsSub} /> : null}
          {has.updates ? <BRow href="/app/updates" lead={grey(<MegaphoneIcon weight="bold" />)} title={t.updates} sub={copy.updatesSub} /> : null}
          <BRow href="/app/profile/calendar" lead={grey(<CalendarPlusIcon weight="bold" />)} title={t.calendar} sub={t.calendarSub} />
        </BList>
      </BCard>
      <BCard title={t.helpLegal} id="b-more-help">
        <BList>
          <BRow href="/app/help" lead={grey(<QuestionIcon weight="bold" />)} title={t.help} sub={t.helpSub} />
          <BRow href="/privacy" lead={grey(<ShieldCheckIcon weight="bold" />)} title={t.privacy} sub={t.privacySub} />
        </BList>
      </BCard>
      {/* Phase 4 (EM-028): Sign out is a control, not a card: a quiet pill with the glyph, under the cards (hugging its
        * label on tablets and desktop, the column's width on phones), as on the Owner's More. */}
      <div className="eb-signout">
        <PortalSignout><button type="submit" className="eb-signout__btn"><SignOutIcon size={18} weight="bold" aria-hidden="true" />{copy.signOut}</button></PortalSignout>
      </div>
    </BStack>
  </BScreen>;
}

/** A question that opens its answer in place (Help): a 64px row whose chevron turns, over the answer. */
function Question({icon, title, sub, blocks}: {icon: ReactNode; title: string; sub?: string; blocks: Block[]}) {
  return <li className="b-li"><details className="eb-q">
    <summary className="b-row b-row--link">{grey(icon)}<span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">{title}</span></span>{sub ? <span className="b-row__s">{sub}</span> : null}</span>
      <CaretDownIcon className="b-chev eb-q__chev" size={18} weight="bold" aria-hidden="true" /></summary>
    <div className="eb-read eb-q__a">{blocks.map((block, index) => <BlockView key={index} block={block} context="employee" />)}</div>
  </details></li>;
}

/** Help for an Employee (board E-Help): Contact with the reply time inside the card, the common questions (each opens in
 * place, as today), then the policy pages when they're published. The copy is the Help page's own. */
export function EmployeeHelpB({email, response, responseSummary, signIn, work, report, legal, lang = 'en'}: {
  email: string; response: string | null; responseSummary?: string | null; signIn: Block[] | null; work: Block[] | null; report: Block[]; legal: boolean;
  /** The person's language (server-safe screen: the page passes it). */ lang?: AccountLang;
}) {
  const copy = accountCopy(lang), t = copy.help;
  return <BScreen back>
    <BHero back={{href: '/app/more', label: copy.common.more}} title={t.title} titleId="b-help-title" sub={t.sub} />
    <BStack>
      <BCard title={t.contact} id="b-help-contact">
        <BList>
          <BRow href={`mailto:${email}`} lead={<BIcon tone="teal"><EnvelopeSimpleIcon weight="bold" /></BIcon>} title={t.email} sub={lang === "es" ? <BEmail address={email} /> : email} />
        </BList>
        {/* Review B6 (NV-286): one line on when we reply (the full hours are on Support), then the warning as its own note. */}
        {response ? <p className="eb-help-note">{responseSummary ?? firstSentence(response)}{response.trim() !== firstSentence(response) ? <> <Link className="eb-help-note__a" href="/app/profile/support">{t.supportHours}</Link></> : null}</p> : null}
        {/* Phase 9 (spec 2.3, 2.4): the safety note is the kit's teal callout with ShieldCheck, titled as Support's is. */}
        <BCallout tone="teal" icon="privacy" title={copy.privateTitle}>{t.privateNote}</BCallout>
      </BCard>
      {signIn || work || report.length ? <BCard title={t.questions} id="b-help-questions">
        <ul className="b-list" aria-label={t.questions}>
          {signIn ? <Question icon={<KeyIcon weight="bold" />} title={t.cantSignIn} blocks={signIn} /> : null}
          {work ? <Question icon={<QuestionIcon weight="bold" />} title={t.work} sub={t.workSub} blocks={work} /> : null}
          {report.length ? <Question icon={<FlagIcon weight="bold" />} title={t.report} sub={t.reportSub} blocks={report} /> : null}
        </ul>
      </BCard> : null}
      {legal ? <BCard title={t.legal} id="b-help-legal">
        <BList>
          <BRow href="/app/profile/privacy" lead={grey(<ShieldCheckIcon weight="bold" />)} title={t.privacyPolicy} />
          <BRow href="/app/profile/terms" lead={grey(<ScalesIcon weight="bold" />)} title={t.terms} />
          <BRow href="/app/profile/account-deletion" lead={grey(<TrashIcon weight="bold" />)} title={t.deletion} />
        </BList>
      </BCard> : null}
    </BStack>
  </BScreen>;
}

const sectionsTitle = (slug: PolicyDocument['slug'], t: AccountCopy['doc']) => slug === 'privacy' ? t.inPolicy : slug === 'terms' ? t.inTerms : t.onPage;
/** Documents whose first section opens by restating the summary (Privacy: "This policy explains how information is
 * handled when you use NEVORA…"), so the summary isn't shown above it. Layout only: the text is the document's. */
const SUMMARY_RESTATED: ReadonlySet<PolicyDocument['slug']> = new Set(['privacy']);

/** A policy page inside the app (board E-Privacy, E-Terms). Batch 1 (Nov 23, item 15): every section is one row of a
 * single list that opens in place, the first one open, so each title shows once at every width (no separate contents
 * list) and the first section sits inside the group it heads. The summary reads above the list unless the first section
 * says it again; then the links to the other pages (the current one isn't repeated). The text is the document's. */
export function EmployeeDocumentB({doc, sub, back, documents, lang = 'en'}: {doc: PolicyDocument; sub: string; back: string; documents: readonly PolicyDocument[];
  /** The person's language for the screen's own words (the document's text is the document's). */ lang?: AccountLang}) {
  const copy = accountCopy(lang), t = copy.doc;
  const intro = !SUMMARY_RESTATED.has(doc.slug), action = doc.slug === 'account-deletion';
  return <BScreen back>
    <BHero back={{href: back, label: copy.common.profile}} title={doc.title} titleId="b-doc-title" sub={sub} />
    <BStack>
      {intro || action ? <article className="b-card eb-doc" aria-labelledby="b-doc-title">
        {intro ? <p className="eb-doc__intro">{doc.summary}</p> : null}
        {/* Review F2 (NV-144): the page's one action is a white pill in the reading card's footer, not a grey slab on the canvas. */}
        {action ? <div className="eb-doc__foot"><BButtonLink href="/app/account/delete" kind="white">{t.reviewDeletion}</BButtonLink></div> : null}
      </article> : null}
      {doc.sections.length ? <BCard title={sectionsTitle(doc.slug, t)} id="b-doc-sections">
        <ul className="b-list">{doc.sections.map((section, index) => <li className="b-li" key={section.heading}><details className="eb-doc__sec" open={index === 0}>
          <summary className="b-row b-row--link"><span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">{section.heading}</span></span></span>
            <CaretDownIcon className="b-chev eb-doc__caret" size={18} weight="bold" aria-hidden="true" /></summary>
          <div className="eb-read eb-doc__body" id={`b-doc-s${index}`}>{section.blocks.map((block, index) => <BlockView key={index} block={block} context="employee" />)}</div>
        </details></li>)}</ul>
      </BCard> : null}
      <nav className="eb-doc__links" aria-label={t.links}>{documents.filter(other => other.slug !== doc.slug).map(other =>
        <Link key={other.slug} href={'/app/profile/' + other.slug}>{shortTitle(other)}</Link>)}</nav>
    </BStack>
  </BScreen>;
}

/** A screen that is only its hero, for a page whose one stateful panel stays the page's own and sits under it (a `b-keep`
 * sibling, lifted over the hero): Passkeys. */
export function EmployeeHeroB({title, titleId, back, sub}: {title: string; titleId: string; back: {href: string; label: string}; sub?: string}) {
  return <BScreen back><BHero back={back} title={title} titleId={titleId} sub={sub} /></BScreen>;
}
