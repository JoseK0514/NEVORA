'use client';

import { readStatements } from './api';
import { usePayrollResource, PAYROLL_SIGNED_OUT } from './use-payroll';
import { formatDisplayDate } from '@/lib/date-utils';
import { dateRange } from '@/lib/duration-format';
import { Celebration } from '../celebration';
import type { PayrollStatementsResponse } from '@/lib/payroll/contracts';
import Link from 'next/link';
import { DownloadIcon } from '../signature/signature';
import styles from './my-pay.module.css';
import { QuietHeader, QuietList, QuietPage, QuietRow } from '../quiet/quiet';
import { useEmployeeMobile } from '../employee-mobile/use-mobile';
import { EmployeePayView } from '../employee-mobile/pay';
import { CorpPayView } from '../employee-mobile/pay-corp';

/* My pay in the Signature style (phase 1, approved Oct 20, 2026; target:
 * docs/product/specs/employee-style/signature/phase-1/p1c-pay.png). The band carries the next payday from the pay
 * schedule; the sheet holds the latest statement, the earlier ones and the privacy line. Statements carry no amounts,
 * so the page shows paydays and the provider's documents, never figures. Same read, refresh and states as before. */

type Statement = PayrollStatementsResponse['statements'][number];
export type NextPay = { payday: string; daysUntil: number; period?: { startDate: string; endDate: string }; /** Workspace zone, so an open page can keep 'Today/Tomorrow' current. */ timeZone?: string } | null;

const utc = (date: string) => new Date(`${date}T12:00:00Z`);
const longDay = (date: string) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric' }).format(utc(date));
/** "Sep 21–27", or "Sep 28–Oct 4" across a month (the app's one date-range form). */
export function periodLabel(start: string, end: string) {
  return dateRange(start, end, { year: 'never' });
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
export function MyPay({ nextPay = null, statement = null, document = null, corporate = false, home }: { nextPay?: NextPay; statement?: string | null; document?: 'unavailable' | 'failed' | 'temporary' | null; /** Corporate (Release 1): an Employee's Pay on the kit, the same page on a phone and in the desktop column. */ corporate?: boolean; /** An Owner's or Manager's name and way back for the same screen. */ home?: { title: string; back?: { href: string; label: string } } }) {
  const { data, loading, error, errorCode, reload } = usePayrollResource('/api/payroll/statements', readStatements);
  const mobile = useEmployeeMobile();
  if (corporate) return <CorpPayView statements={data?.statements ?? null} loading={loading} error={error} errorCode={errorCode} nextPay={nextPay} statement={statement} document={document} reload={() => void reload()} home={home} />;
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
    {payday ? <div className="q-lead"><b>{`Scheduled payday is ${payday}`}</b><i>{[when, nextPay?.period ? `for ${periodLabel(nextPay.period.startDate, nextPay.period.endDate)}` : null].filter(Boolean).join(' · ')}</i></div> : null}
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
      : <p className="q-empty">No pay statements shared yet.</p>}
    <p className="q-help">Only your own pay statements are available here. Downloaded files may contain personal pay information.</p>
  </QuietPage>;
}

/** Phase 2 (G10, brief rule 1): an Owner's or Manager's My pay is the Employee's Pay screen with their own statements
 * (the same read), named "My pay" (no band back link: in the Manager shell it lands on the logo; the tab bar and More reach it). The separate look-alike it replaced is gone. */
export const MY_PAY_HOME = { title: 'My pay' } as const;
