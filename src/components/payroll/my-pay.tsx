'use client';

import { readStatements } from './api';
import { usePayrollResource } from './use-payroll';
import { usePayrollCopy, type PayrollLang } from './payroll-copy';
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
const locale = (lang: PayrollLang) => lang === 'es' ? 'es-PR' : 'en-US';
/** "October 16"; Spanish "16 de octubre". */
const longDay = (date: string, lang: PayrollLang = 'en') => new Intl.DateTimeFormat(locale(lang), { timeZone: 'UTC', month: 'long', day: 'numeric' }).format(utc(date));
/** "Tue, Oct 16"; Spanish "mar, 16 oct" (voice.md: no period, September is "sep"). */
const shortDay = (date: string, lang: PayrollLang) => new Intl.DateTimeFormat(locale(lang), { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }).format(utc(date)).replace(/\./g, '').replace(/\bsept\b/g, 'sep');
/** "Sep 21–27", or "Sep 28–Oct 4" across a month (the app's one date-range form); Spanish "21–27 sep". */
export function periodLabel(start: string, end: string, lang: PayrollLang = 'en') {
  return lang === 'es' ? dateRange(start, end, { year: 'never', locale: 'es-PR' }).replace(/\./g, '').replace(/\bsept\b/g, 'sep') : dateRange(start, end, { year: 'never' });
}
const documentHref = (statement: Statement) => `/api/payroll/documents/${encodeURIComponent(statement.id)}`;

/** The newest published statement: its payday, its period and the provider's document. */
export function PaydayMoment({ statement }: { statement: Statement }) {
  const { myPay: t, lang } = usePayrollCopy();
  const day = longDay(statement.payday, lang);
  return <section className={styles.mpLatest} aria-labelledby="pw-payday-title">
    <Celebration kind="PAYDAY_AVAILABLE" eventKey={statement.id} confirmed={statement.published} />
    <div className={styles.mpLatestCopy}>
      <p className={styles.mpKicker}>{t.latest}</p>
      <h2 id="pw-payday-title"><span className="nv-sr">{t.paydaySr}</span>{day}</h2>
      <p>{periodLabel(statement.period.startDate, statement.period.endDate, lang)} · {t.pdf}<span className="nv-sr">{t.publishedSr}</span></p>
      {statement.viewUrl ? <a className={`sg-link ${styles.mpView}`} href={`${documentHref(statement)}/view`}>{t.view}<span className="nv-sr">{t.viewStatementSr(day)}</span></a> : null}
    </div>
    <a className="sg-primary" href={documentHref(statement)} aria-label={t.downloadStatement(day)}><DownloadIcon />{t.download}</a>
  </section>;
}

const newestFirst = (a: { payday: string }, b: { payday: string }) => b.payday.localeCompare(a.payday);

/** v5 "One look" (Jose approved round 2 "exactly like this" on Oct 24, 2026; mockup E11): an Employee's or Lead's Pay tab.
 * The next payday as one line, this week's time, then the published statements and the privacy note (wording unchanged).
 * Same statements read, refresh and download links as before. */
export function MyPay({ nextPay = null, statement = null, document = null, corporate = false, home }: { nextPay?: NextPay; statement?: string | null; document?: 'unavailable' | 'failed' | 'temporary' | null; /** Corporate (Release 1): an Employee's Pay on the kit, the same page on a phone and in the desktop column. */ corporate?: boolean; /** An Owner's or Manager's name and way back for the same screen. */ home?: { title: string; back?: { href: string; label: string } } }) {
  const { data, loading, error, errorCode, reload } = usePayrollResource('/api/payroll/statements', readStatements);
  const mobile = useEmployeeMobile();
  const { myPay: t, lang } = usePayrollCopy();
  if (corporate) return <CorpPayView statements={data?.statements ?? null} loading={loading} error={error} errorCode={errorCode} nextPay={nextPay} statement={statement} document={document} reload={() => void reload()} home={home} />;
  // One read for both presentations, so rotating a phone never refetches or drops the list.
  if (mobile) return <QuietPage><EmployeePayView statements={data?.statements ?? null} loading={loading} error={error} errorCode={errorCode} nextPay={nextPay} statement={statement} document={document} reload={() => void reload()} /></QuietPage>;
  const statements = data ? [...data.statements].sort(newestFirst) : [];
  const days = nextPay?.daysUntil;
  const payday = nextPay ? new Intl.DateTimeFormat(locale(lang), { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' }).format(utc(nextPay.payday)) : null;
  const when = days === undefined ? null : days === 0 ? t.today : days === 1 ? t.tomorrow : t.inDays(days);
  return <QuietPage className="q-pay">
    <div className="q-top-gap" aria-hidden="true" />
    <QuietHeader title={t.pay} />
    {/* A statement link that failed returns here on desktop too, with the same explanation as the phone view. */}
    {document ? <div className="q-emptyblock" role="alert"><p className="q-empty">{document === 'failed' ? t.documentFailed : document === 'temporary' ? t.documentTemporary : t.documentUnavailable}</p></div> : null}
    {payday ? <div className="q-lead"><b>{t.scheduledPayday(payday)}</b><i>{[when, nextPay?.period ? t.forPeriod(periodLabel(nextPay.period.startDate, nextPay.period.endDate, lang)) : null].filter(Boolean).join(' · ')}</i></div> : null}
    <div className="q-grp" style={{ marginTop: payday ? 32 : 28 }}><h2 id="mp-week">{t.thisWeek}</h2></div>
    <QuietList label={t.thisWeek}>
      <QuietRow one href="/app/my-time" title={t.myTime} />
      <QuietRow one href="/app/timecards" title={t.timecards} />
    </QuietList>
    <div className="q-grp"><h2 id="mp-statements">{t.statements}</h2></div>
    {loading ? <p className="q-empty" role="status">{t.loading}</p>
      : error ? <div className="q-emptyblock" role="alert"><p className="q-empty">{errorCode === 'SIGNED_OUT' ? t.signInAgain : t.couldNotLoad}</p>
        <div className="q-emptyblock__action">{errorCode === 'SIGNED_OUT' ? <Link className="q-btn q-btn--sec" href="/login">{t.signIn}</Link> : <button type="button" className="q-btn q-btn--sec" onClick={() => void reload()}>{t.tryAgain}</button>}</div></div>
      : statements.length ? <QuietList label={t.statements}>{statements.map((statement, index) => <li key={statement.id} className="q-pay__row">
          {index === 0 ? <Celebration kind="PAYDAY_AVAILABLE" eventKey={statement.id} confirmed={statement.published} /> : null}
          <QuietRow bare href={documentHref(statement)} title={t.paydayTitle(shortDay(statement.payday, lang))} detail={`${periodLabel(statement.period.startDate, statement.period.endDate, lang)} · ${t.pdf}`} label={t.downloadFile(statement.filename)} />
          {statement.viewUrl ? <a className="q-pay__view" href={`${documentHref(statement)}/view`} aria-label={t.viewFile(statement.filename)}>{t.view}</a> : null}
        </li>)}</QuietList>
      : <p className="q-empty">{t.noneShared}</p>}
    <p className="q-help">{t.privacy}</p>
  </QuietPage>;
}

/** Phase 2 (G10, brief rule 1): an Owner's or Manager's My pay is the Employee's Pay screen with their own statements
 * (the same read), named "My pay" (no band back link: in the Manager shell it lands on the logo; the tab bar and More reach it). The separate look-alike it replaced is gone. */
export const MY_PAY_HOME = { title: 'My pay' } as const;
