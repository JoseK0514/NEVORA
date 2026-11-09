'use client';

import { readStatements } from './api';
import { usePayrollResource, PAYROLL_SIGNED_OUT } from './use-payroll';
import { formatDisplayDate } from '@/lib/date-utils';
import { Celebration } from '../celebration';
import type { PayrollStatementsResponse } from '@/lib/payroll/contracts';
import Link from 'next/link';
import { DownloadIcon } from '../signature/signature';
import styles from './my-pay.module.css';
import { QuietHeader, QuietList, QuietPage, QuietRow } from '../quiet/quiet';
import { useEmployeeMobile } from '../employee-mobile/use-mobile';
import { EmployeePayView } from '../employee-mobile/pay';
import { CorpPayView } from '../employee-mobile/pay-corp';
import { CorpButtonLink, CorpCard, CorpErrorCard, CorpNav, CorpPage, CorpRow, CorpRows, CorpTitle } from '../corp/corp';

/* My pay in the Signature style (phase 1, approved Oct 20, 2026; target:
 * docs/product/specs/employee-style/signature/phase-1/p1c-pay.png). The band carries the next payday from the pay
 * schedule; the sheet holds the latest statement, the earlier ones and the privacy line. Statements carry no amounts,
 * so the page shows paydays and the provider's documents, never figures. Same read, refresh and states as before. */

type Statement = PayrollStatementsResponse['statements'][number];
export type NextPay = { payday: string; daysUntil: number; period?: { startDate: string; endDate: string }; /** Workspace zone, so an open page can keep 'Today/Tomorrow' current. */ timeZone?: string } | null;

const utc = (date: string) => new Date(`${date}T12:00:00Z`);
const longDay = (date: string) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric' }).format(utc(date));
/** "Sep 21–27", or "Sep 28 – Oct 4" across a month. */
export function periodLabel(start: string, end: string) {
  const month = (date: string) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short' }).format(utc(date));
  return start.slice(0, 7) === end.slice(0, 7) ? `${month(start)} ${Number(start.slice(8))}–${Number(end.slice(8))}` : `${month(start)} ${Number(start.slice(8))} – ${month(end)} ${Number(end.slice(8))}`;
}
const documentHref = (statement: Statement) => `/api/payroll/documents/${encodeURIComponent(statement.id)}`;

/** The newest published statement: its payday, its period and the provider's document. */
export function PaydayMoment({ statement }: { statement: Statement }) {
  return <section className={styles.mpLatest} aria-labelledby="pw-payday-title">
    <Celebration kind="PAYDAY_AVAILABLE" eventKey={statement.id} confirmed={statement.published} />
    <div className={styles.mpLatestCopy}>
      <p className={styles.mpKicker}>Latest statement</p>
      <h2 id="pw-payday-title"><span className="nv-sr">Payday </span>{longDay(statement.payday)}</h2>
      <p>{periodLabel(statement.period.startDate, statement.period.endDate)} · PDF<span className="nv-sr">, published pay statement</span></p>
      {statement.viewUrl ? <a className={`sg-link ${styles.mpView}`} href={`${documentHref(statement)}/view`}>View<span className="nv-sr"> statement, payday {longDay(statement.payday)}</span></a> : null}
    </div>
    <a className="sg-primary" href={documentHref(statement)} aria-label={`Download statement, payday ${longDay(statement.payday)}`}><DownloadIcon />Download</a>
  </section>;
}

const newestFirst = (a: { payday: string }, b: { payday: string }) => b.payday.localeCompare(a.payday);

/** v5 "One look" (Jose approved round 2 "exactly like this" on Oct 24, 2026; mockup E11): an Employee's or Lead's Pay tab.
 * The next payday as one line, this week's time, then the published statements and the privacy note (wording unchanged).
 * Same statements read, refresh and download links as before. */
export function MyPay({ nextPay = null, statement = null, document = null, corporate = false }: { nextPay?: NextPay; statement?: string | null; document?: 'unavailable' | 'failed' | 'temporary' | null; /** Corporate (Release 1): an Employee's Pay on the kit, the same page on a phone and in the desktop column. */ corporate?: boolean }) {
  const { data, loading, error, errorCode, reload } = usePayrollResource('/api/payroll/statements', readStatements);
  const mobile = useEmployeeMobile();
  if (corporate) return <CorpPayView statements={data?.statements ?? null} loading={loading} error={error} errorCode={errorCode} nextPay={nextPay} statement={statement} document={document} reload={() => void reload()} />;
  // One read for both presentations, so rotating a phone never refetches or drops the list.
  if (mobile) return <QuietPage><EmployeePayView statements={data?.statements ?? null} loading={loading} error={error} errorCode={errorCode} nextPay={nextPay} statement={statement} document={document} reload={() => void reload()} /></QuietPage>;
  const statements = data ? [...data.statements].sort(newestFirst) : [];
  const days = nextPay?.daysUntil;
  const payday = nextPay ? new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' }).format(utc(nextPay.payday)) : null;
  const when = days === undefined ? null : days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`;
  return <QuietPage className="q-pay">
    <div className="q-top-gap" aria-hidden="true" />
    <QuietHeader title="Pay" />
    {/* A statement link that failed returns here on desktop too, with the same explanation as the phone view. */}
    {document ? <div className="q-emptyblock" role="alert"><p className="q-empty">{document === 'failed' ? 'We couldn’t open that statement. It didn’t pass NEVORA’s file check. Try again later, or ask your manager.' : document === 'temporary' ? 'We couldn’t open that statement just now. Try again in a moment.' : 'That statement isn’t available. It may have been replaced, or your access changed.'}</p></div> : null}
    {payday ? <div className="q-lead"><b>{`Next payday is ${payday}`}</b><i>{[when, nextPay?.period ? `for ${periodLabel(nextPay.period.startDate, nextPay.period.endDate).replace('–', ' – ')}` : null].filter(Boolean).join(' · ')}</i></div> : null}
    <div className="q-grp" style={{ marginTop: payday ? 32 : 28 }}><h2 id="mp-week">This week</h2></div>
    <QuietList label="This week">
      <QuietRow one href="/app/my-time" title="My time" />
      <QuietRow one href="/app/timecards" title="Timecards" />
    </QuietList>
    <div className="q-grp"><h2 id="mp-statements">Statements</h2></div>
    {loading ? <p className="q-empty" role="status">Loading your statements…</p>
      : error ? <div className="q-emptyblock" role="alert"><p className="q-empty">{error === PAYROLL_SIGNED_OUT ? 'Sign in again to see your statements.' : 'Couldn’t load your statements.'}</p>
        <div className="q-emptyblock__action">{error === PAYROLL_SIGNED_OUT ? <Link className="q-btn q-btn--sec" href="/login">Sign in</Link> : <button type="button" className="q-btn q-btn--sec" onClick={() => void reload()}>Try again</button>}</div></div>
      : statements.length ? <QuietList label="Statements">{statements.map((statement, index) => <li key={statement.id} className="q-pay__row">
          {index === 0 ? <Celebration kind="PAYDAY_AVAILABLE" eventKey={statement.id} confirmed={statement.published} /> : null}
          <QuietRow bare href={documentHref(statement)} title={`Payday ${formatDisplayDate(statement.payday)}`} detail={`${periodLabel(statement.period.startDate, statement.period.endDate)} · PDF`} label={`Download ${statement.filename}`} />
          {statement.viewUrl ? <a className="q-pay__view" href={`${documentHref(statement)}/view`} aria-label={`View ${statement.filename}`}>View</a> : null}
        </li>)}</QuietList>
      : <p className="q-empty">No published statements yet.</p>}
    <p className="q-help">Only your own published statements are available here. Downloaded files may contain personal pay information.</p>
  </QuietPage>;
}

/** My pay for Owners and Managers. Nov 1 upscale (review M4): on the kit's card pattern, a pushed page ("‹ More", My pay
 * centred on a phone): a Payday card (the next payday and how far away it is), then a Statements card (each statement a
 * row that downloads it, or the kit's empty state). Same statements read, refresh, download links and wording. */
export function QuietMyPay({ nextPay = null }: { nextPay?: NextPay }) {
  const { data, loading, error, reload } = usePayrollResource('/api/payroll/statements', readStatements);
  const statements = data ? [...data.statements].sort(newestFirst) : [];
  const days = nextPay?.daysUntil;
  const payday = nextPay ? new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }).format(utc(nextPay.payday)) : null;
  const away = days === undefined ? undefined : days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`;
  return <CorpPage className="c-mypay c-page--narrow" labelledBy="mypay-title">
    <CorpNav back={{ href: '/app/more', label: 'More' }} title="My pay" titleId="mypay-nav-title" phoneOnly />
    <CorpTitle id="mypay-title" title="My pay" wide />
    {payday ? <CorpCard id="mypay-payday" label="Payday">
      <CorpRows label="Payday"><li><CorpRow title={payday} bold detail={nextPay?.period ? `Pay period ${periodLabel(nextPay.period.startDate, nextPay.period.endDate).replace('–', ' – ')}` : undefined} value={away} valueTone="soft" /></li></CorpRows>
    </CorpCard> : null}
    {loading ? <CorpCard id="mypay-statements" label="Statements"><div className="c-empty c-empty--card" role="status"><span className="c-empty__body">Loading…</span></div></CorpCard>
      : error ? <CorpErrorCard title={error === PAYROLL_SIGNED_OUT ? 'Sign in again to see your statements.' : 'Couldn’t load your statements.'} body={null}
        action={error === PAYROLL_SIGNED_OUT ? <CorpButtonLink href="/login" kind="neutral" size="md">Sign in</CorpButtonLink> : <button type="button" className="c-btn c-btn--neutral c-btn--md" onClick={() => void reload()}>Try again</button>} />
      : <CorpCard id="mypay-statements" label="Statements">{statements.length
        ? <CorpRows label="Statements">{statements.map(statement => <li key={statement.id}><CorpRow href={documentHref(statement)} native bold
          title={`Payday ${formatDisplayDate(statement.payday)}`} detail={`${periodLabel(statement.period.startDate, statement.period.endDate)} · PDF`} label={`Download ${statement.filename}`} chevron /></li>)}</CorpRows>
        : <div className="c-empty c-empty--card"><b className="c-empty__title">No statements yet</b><span className="c-empty__body">Only you can see them.</span></div>}</CorpCard>}
  </CorpPage>;
}
