'use client';

import { readStatements } from './api';
import { usePayrollResource, PAYROLL_SIGNED_OUT } from './use-payroll';
import { formatDateRange, formatDisplayDate } from '@/lib/date-utils';
import { Celebration } from '../celebration';
import type { PayrollStatementsResponse } from '@/lib/payroll/contracts';
import Link from 'next/link';
import { SigBand, SigPage, SigSection, DownloadIcon } from '../signature/signature';
import styles from './my-pay.module.css';
import { QuietHeader, QuietList, QuietNav, QuietPage, QuietRow } from '../quiet/quiet';

/* My pay in the Signature style (phase 1, approved Oct 20, 2026; target:
 * docs/product/specs/employee-style/signature/phase-1/p1c-pay.png). The band carries the next payday from the pay
 * schedule; the sheet holds the latest statement, the earlier ones and the privacy line. Statements carry no amounts,
 * so the page shows paydays and the provider's documents, never figures. Same read, refresh and states as before. */

type Statement = PayrollStatementsResponse['statements'][number];
export type NextPay = { payday: string; daysUntil: number } | null;

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

export function MyPay({ nextPay = null }: { nextPay?: NextPay }) {
  const { data, loading, error, reload } = usePayrollResource('/api/payroll/statements', readStatements);
  const statements = data ? [...data.statements].sort(newestFirst) : [];
  const days = nextPay?.daysUntil;
  const band = nextPay ? <SigBand eyebrow="Next payday">
    <h1 className="nv-sr">My pay</h1>
    <b className="sg-date">{new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }).format(utc(nextPay.payday))}</b>
    <p className="sg-sub"><span>{new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long' }).format(utc(nextPay.payday))}</span>{days !== undefined && days >= 0 ? <b>{days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`}</b> : null}</p>
  </SigBand> : <SigBand eyebrow="Pay statements"><h1 className="sg-word">My pay</h1><p className="sg-sub"><span>Your published pay statements.</span></p></SigBand>;

  return <SigPage band={band} className={styles.mpRoot}>
    {loading ? <div className={styles.mpLatest} role="status"><div className={styles.mpLatestCopy}><p className={styles.mpKicker}>Latest statement</p><p className={styles.mpLoadingTitle}>Loading your statements</p><p>Checking your private pay documents.</p></div></div>
      : error ? <div className="sg-alert" role="alert"><strong>Statements unavailable</strong><span>{error}</span>{error === PAYROLL_SIGNED_OUT ? <Link className="sg-link" href="/login">Sign in</Link> : <button type="button" className="sg-link" onClick={() => void reload()}>Try again</button>}</div>
      : statements.length ? <>
        <PaydayMoment statement={statements[0]} />
        {statements.length > 1 ? <SigSection id="pw-earlier" title="Earlier statements">
          <ul className="sg-list">{statements.slice(1).map(statement => <li key={statement.id} className="sg-row">
            <span className="sg-copy"><b>Payday {formatDisplayDate(statement.payday)}</b><span>{formatDateRange(statement.period.startDate, statement.period.endDate)} · Published pay statement</span></span>
            <div className={styles.mpActions}>
              {statement.viewUrl ? <a className="sg-link" href={`${documentHref(statement)}/view`} aria-label={`View ${statement.filename}`}>View</a> : null}
              <a className="sg-round" href={documentHref(statement)} aria-label={`Download ${statement.filename}`}><DownloadIcon /></a>
            </div>
          </li>)}</ul>
        </SigSection> : null}
      </>
      : <div className="sg-alert" role="status"><strong>No published statements yet</strong><span>Your pay statements will appear when your company publishes them. Contact your payroll administrator if a statement is missing.</span></div>}
    <div className="sg-quiet">
      <span className={styles.mpPrivacy}><svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="5.5" y="10.5" width="13" height="9" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>Only your own published statements are available here. Downloaded files may contain personal pay information.</span>
      {error ? null : <button type="button" className="sg-link" disabled={loading} onClick={() => void reload()}>Refresh<span className="nv-sr"> statements</span></button>}
    </div>
  </SigPage>;
}

/** Quiet (v4, approved Oct 23): My pay for Owners and Managers. The next payday as one lead line, then the statements. */
export function QuietMyPay({ nextPay = null }: { nextPay?: NextPay }) {
  const { data, loading, error, reload } = usePayrollResource('/api/payroll/statements', readStatements);
  const statements = data ? [...data.statements].sort(newestFirst) : [];
  const days = nextPay?.daysUntil;
  const payday = nextPay ? new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' }).format(utc(nextPay.payday)) : null;
  return <QuietPage>
    <QuietNav back={{ href: '/app/more', label: 'More' }} />
    <QuietHeader title="My pay" />
    {payday ? <div className="q-lead"><b>{`Next payday is ${payday}`}</b>{days !== undefined ? <i>{days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`}</i> : null}</div> : null}
    <div className="q-grp" style={{ marginTop: payday ? 40 : 28 }}><h2 id="mp-statements">Statements</h2></div>
    {loading ? <p className="q-empty" role="status">Loading…</p>
      : error ? <div className="q-emptyblock" role="alert"><p className="q-empty">{error === PAYROLL_SIGNED_OUT ? 'Sign in again to see your statements.' : 'Couldn’t load your statements.'}</p>
        <div className="q-emptyblock__action">{error === PAYROLL_SIGNED_OUT ? <Link className="q-btn q-btn--sec" href="/login">Sign in</Link> : <button type="button" className="q-btn q-btn--sec" onClick={() => void reload()}>Try again</button>}</div></div>
      : statements.length ? <QuietList label="Statements">{statements.map(statement => <QuietRow key={statement.id} href={documentHref(statement)}
          title={`Payday ${formatDisplayDate(statement.payday)}`} detail={`${periodLabel(statement.period.startDate, statement.period.endDate)} · PDF`} label={`Download ${statement.filename}`} />)}</QuietList>
      : <p className="q-empty">No statements yet. Only you can see them.</p>}
  </QuietPage>;
}
