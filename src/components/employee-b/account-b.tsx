import Link from 'next/link';
import type {ReactNode} from 'react';
import {CalendarCheckIcon} from '@phosphor-icons/react/dist/ssr/CalendarCheck';
import {BellIcon} from '@phosphor-icons/react/dist/ssr/Bell';
import {MegaphoneSimpleIcon} from '@phosphor-icons/react/dist/ssr/MegaphoneSimple';
import {CalendarPlusIcon} from '@phosphor-icons/react/dist/ssr/CalendarPlus';
import {LifebuoyIcon} from '@phosphor-icons/react/dist/ssr/Lifebuoy';
import {ShieldCheckIcon} from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {EnvelopeSimpleIcon} from '@phosphor-icons/react/dist/ssr/EnvelopeSimple';
import {KeyIcon} from '@phosphor-icons/react/dist/ssr/Key';
import {QuestionIcon} from '@phosphor-icons/react/dist/ssr/Question';
import {FlagIcon} from '@phosphor-icons/react/dist/ssr/Flag';
import {ScalesIcon} from '@phosphor-icons/react/dist/ssr/Scales';
import {TrashIcon} from '@phosphor-icons/react/dist/ssr/Trash';
import {BAvatar, BButtonLink, BCard, BHero, BIcon, BList, BRow, BScreen, BStack} from '../owner-b/b-kit';
import {PortalSignout} from '../portal-signout';
import {BlockView, shortTitle} from '../legal/legal-document';
import type {Block, PolicyDocument} from '../../lib/legal/policies';
import {NoHeaderActions} from './account-host';
import './account.css';

/* Employee phones, Direction B, the Account group (Jose approved the mock "Employee mobile, Direction B", Nov 6, 2026):
 * More, Help and the policy documents. Server-safe pieces (no hooks or handlers); the screens that hold a read or a
 * command live in account-b-client.tsx. Presentation only: each page passes the values, links and actions it already
 * has, and the corporate layout beside it stays what tablets and desktop show. */

const grey = (icon: ReactNode) => <BIcon tone="grey">{icon}</BIcon>;

/** More (board E-More): your face, name and places on glass with Profile and settings under them, then Your work, Help
 * and legal, and Sign out on its own. Only places the company has switched on; values are the page's own reads. */
export function EmployeeMoreB({name, place, availability, has, count}: {
  name: string; place: string; availability: string | null; count: ReactNode;
  has: {availability: boolean; notifications: boolean; updates: boolean};
}) {
  return <BScreen back>
    <NoHeaderActions />
    <BHero back={{href: '/app', label: 'Home'}} title="More" titleId="b-more-title">
      <div className="eb-id b-glass">
        <div className="eb-id__me"><BAvatar name={name} size={48} /><span className="eb-id__tx"><b>{name}</b>{place ? <span>{place.split(' · ').map((part, index) => <span key={index} className="eb-nowrap">{index ? ' · ' : ''}{part}</span>)}</span> : null}</span></div>
        <Link className="eb-id__link" href="/app/profile" aria-label={`Profile and settings, ${name}`}>Profile and settings<CaretRightIcon size={18} weight="bold" aria-hidden="true" /></Link>
      </div>
    </BHero>
    <BStack>
      <BCard title="Your work" id="b-more-work">
        <BList>
          {has.availability ? <BRow href="/app/availability" lead={grey(<CalendarCheckIcon weight="bold" />)} title="Availability" sub={availability ?? undefined} /> : null}
          {has.notifications ? <BRow href="/app/notifications" lead={grey(<BellIcon weight="bold" />)} title="Notifications" chip={count} sub="Schedule, request and pay notices" /> : null}
          {has.updates ? <BRow href="/app/updates" lead={grey(<MegaphoneSimpleIcon weight="bold" />)} title="Updates" sub="Current messages shared with you" /> : null}
          <BRow href="/app/profile/calendar" lead={grey(<CalendarPlusIcon weight="bold" />)} title="Add shifts to your calendar" sub="Apple, Google or Outlook" />
        </BList>
      </BCard>
      <BCard title="Help and legal" id="b-more-help">
        <BList>
          <BRow href="/app/help" lead={grey(<LifebuoyIcon weight="bold" />)} title="Help" sub="Answers and how to reach support" />
          <BRow href="/privacy" lead={grey(<ShieldCheckIcon weight="bold" />)} title="Privacy and terms" sub="Privacy policy and terms of use" />
        </BList>
      </BCard>
      <section className="b-card eb-signout" aria-label="Sign out">
        <PortalSignout><button type="submit" className="eb-signout__btn">Sign out</button></PortalSignout>
      </section>
    </BStack>
  </BScreen>;
}

/** A question that opens its answer in place (Help): a 64px row whose chevron turns, over the answer. */
function Question({icon, title, sub, blocks}: {icon: ReactNode; title: string; sub?: string; blocks: Block[]}) {
  return <li className="b-li"><details className="eb-q">
    <summary className="b-row b-row--link">{grey(icon)}<span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">{title}</span></span>{sub ? <span className="b-row__s">{sub}</span> : null}</span>
      <CaretRightIcon className="b-chev eb-q__chev" size={18} weight="bold" aria-hidden="true" /></summary>
    <div className="eb-read eb-q__a">{blocks.map((block, index) => <BlockView key={index} block={block} context="employee" />)}</div>
  </details></li>;
}

/** Help for an Employee (board E-Help): Contact with the reply time inside the card, the common questions (each opens in
 * place, as today), then the policy pages when they're published. The copy is the Help page's own. */
export function EmployeeHelpB({email, response, signIn, work, report, legal}: {
  email: string; response: string | null; signIn: Block[] | null; work: Block[] | null; report: Block[]; legal: boolean;
}) {
  return <BScreen back>
    <BHero back={{href: '/app/more', label: 'More'}} title="Help" titleId="b-help-title" sub="Contact support or find an answer" />
    <BStack>
      <BCard title="Contact" id="b-help-contact">
        <BList>
          <BRow href={`mailto:${email}`} lead={<BIcon tone="teal"><EnvelopeSimpleIcon weight="bold" /></BIcon>} title="Email support" sub={email} label={`Email support, ${email}`} />
        </BList>
        <p className="eb-help-note">{response ? `${response} ` : ''}<b>Never email passwords, codes, bank details or pay documents.</b></p>
      </BCard>
      {signIn || work || report.length ? <BCard title="Common questions" id="b-help-questions">
        <ul className="b-list" aria-label="Common questions">
          {signIn ? <Question icon={<KeyIcon weight="bold" />} title="I can’t sign in" blocks={signIn} /> : null}
          {work ? <Question icon={<QuestionIcon weight="bold" />} title="Shift, time off or pay" sub="Ask your manager" blocks={work} /> : null}
          {report.length ? <Question icon={<FlagIcon weight="bold" />} title="Report a problem" sub="Something isn’t working" blocks={report} /> : null}
        </ul>
      </BCard> : null}
      {legal ? <BCard title="Privacy and terms" id="b-help-legal">
        <BList>
          <BRow href="/app/profile/privacy" lead={grey(<ShieldCheckIcon weight="bold" />)} title="Privacy Policy" />
          <BRow href="/app/profile/terms" lead={grey(<ScalesIcon weight="bold" />)} title="Terms of Use" />
          <BRow href="/app/profile/account-deletion" lead={grey(<TrashIcon weight="bold" />)} title="Account deletion" />
        </BList>
      </BCard> : null}
    </BStack>
  </BScreen>;
}

const SECTIONS_TITLE: Partial<Record<PolicyDocument['slug'], string>> = {privacy: 'In this policy', terms: 'In these terms'};

/** A policy page inside the app (board E-Privacy, E-Terms): the summary and the first section open in one reading card,
 * the other sections as one list that opens in place, then the links to the other pages. The text is the document's. */
export function EmployeeDocumentB({doc, sub, back, documents}: {doc: PolicyDocument; sub: string; back: string; documents: readonly PolicyDocument[]}) {
  const [first, ...rest] = doc.sections;
  return <BScreen back>
    <BHero back={{href: back, label: 'Profile'}} title={doc.title} titleId="b-doc-title" sub={sub} />
    <BStack>
      <article className="b-card eb-doc" aria-labelledby="b-doc-title">
        <p className="eb-doc__intro">{doc.summary}</p>
        {first ? <details className="eb-doc__first" open>
          <summary><h2>{first.heading}</h2><CaretDownIcon className="eb-doc__caret" size={18} weight="bold" aria-hidden="true" /></summary>
          <div className="eb-read">{first.blocks.map((block, index) => <BlockView key={index} block={block} context="employee" />)}</div>
        </details> : null}
      </article>
      {rest.length ? <BCard title={SECTIONS_TITLE[doc.slug] ?? 'On this page'} id="b-doc-sections">
        <ul className="b-list">{rest.map(section => <li className="b-li" key={section.heading}><details className="eb-doc__sec">
          <summary className="b-row b-row--link"><span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">{section.heading}</span></span></span>
            <CaretDownIcon className="b-chev eb-doc__caret" size={18} weight="bold" aria-hidden="true" /></summary>
          <div className="eb-read eb-doc__body">{section.blocks.map((block, index) => <BlockView key={index} block={block} context="employee" />)}</div>
        </details></li>)}</ul>
      </BCard> : null}
      {doc.slug === 'account-deletion' ? <BButtonLink href="/app/account/delete" kind="quiet" full>Review deletion request</BButtonLink> : null}
      <nav className="eb-doc__links" aria-label="NEVORA policies and help">{documents.map(other => other.slug === doc.slug
        ? <span key={other.slug} aria-current="page">{shortTitle(other)}</span>
        : <Link key={other.slug} href={'/app/profile/' + other.slug}>{shortTitle(other)}</Link>)}</nav>
    </BStack>
  </BScreen>;
}

/** A screen that is only its hero, for a page whose one stateful panel stays the page's own and sits under it (a `b-keep`
 * sibling, lifted over the hero): Passkeys. */
export function EmployeeHeroB({title, titleId, back, sub}: {title: string; titleId: string; back: {href: string; label: string}; sub?: string}) {
  return <BScreen back><BHero back={back} title={title} titleId={titleId} sub={sub} /></BScreen>;
}
