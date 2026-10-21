'use client';

import Link from 'next/link';
import { CaretLeftIcon, DownloadSimpleIcon, LockSimpleIcon } from '@phosphor-icons/react/ssr';
import { readStatements } from './api';
import { usePayrollResource, PAYROLL_SIGNED_OUT } from './use-payroll';
import { Celebration } from '../celebration';
import { PageBand } from '../kit/kit';
import { periodLabel, type NextPay } from './my-pay';
import type { PayrollStatementsResponse } from '@/lib/payroll/contracts';
import './manager-my-pay.css';

/* UI-4: My pay for Owners and Managers in the clean v3 frame (the employee My pay keeps its Signature look). A standard
 * "My pay" title on the white canvas, the dark-teal payday card with its NEVORA mark and a 600-weight date, then the
 * statements as grouped rows and the privacy line in the page foot. Same read, refresh, states and wording as before. */

type Statement = PayrollStatementsResponse['statements'][number];
const utc = (date: string) => new Date(`${date}T12:00:00Z`);
const format = (date: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...options }).format(utc(date));
const longDay = (date: string) => format(date, { month: 'long', day: 'numeric' });
const documentHref = (statement: Statement) => `/api/payroll/documents/${encodeURIComponent(statement.id)}`;
const newestFirst = (a: { payday: string }, b: { payday: string }) => b.payday.localeCompare(a.payday);

export function ManagerMyPay({ nextPay = null }: { nextPay?: NextPay }) {
  const { data, loading, error, reload } = usePayrollResource('/api/payroll/statements', readStatements);
  const statements = data ? [...data.statements].sort(newestFirst) : [];
  const latest = statements[0];
  const days = nextPay?.daysUntil;
  return <div className="nv-page cm-page cm-mypay" data-nv-page="">
    <div className="cm-mp-navbar"><button type="button" className="cm-mp-back" popoverTarget="manager-more-navigation"><CaretLeftIcon size={20} weight="bold" aria-hidden="true" />More</button></div>
    <PageBand title="My pay" overlap={false} summary={nextPay ? undefined : 'Your published pay statements.'} />
    <div className="nv-content cm-mp-content">
      {nextPay ? <section className="cm-mp-payday" aria-label="Next payday">
        <svg className="cm-mp-mark" viewBox="0 0 360 340" aria-hidden="true" focusable="false"><path className="cm-mp-mark__l" d="M20 330 L180 30 L340 330 L276 330 L180 150 L84 330 Z" /><path className="cm-mp-mark__t" d="M146 330 L180 266 L214 330 Z" /></svg>
        <p className="cm-mp-payday__label">Next payday</p>
        <p className="cm-mp-payday__date">{format(nextPay.payday, { month: 'short', day: 'numeric' })}</p>
        <p className="cm-mp-payday__sub"><span>{format(nextPay.payday, { weekday: 'long' })}</span>{days !== undefined && days >= 0 ? <b>{days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`}</b> : null}</p>
      </section> : null}

      {loading ? <section className="nv-card cm-mp-card" role="status" aria-label="Latest statement">
        <div className="nv-card__head"><h2 className="nv-card__title">Latest statement</h2></div>
        <div className="nv-card__body"><p className="cm-mp-strong">Loading your statements</p><p className="cm-mp-muted">Checking your private pay documents.</p></div>
      </section>
      : error ? <section className="nv-card cm-mp-card cm-mp-alert" role="alert">
        <div className="nv-card__body"><p className="cm-mp-strong">Statements unavailable</p><p className="cm-mp-muted">{error}</p>
          {error === PAYROLL_SIGNED_OUT ? <Link className="nv-link cm-mp-link" href="/login">Sign in</Link> : <button type="button" className="nv-link cm-mp-link" onClick={() => void reload()}>Try again</button>}</div>
      </section>
      : latest ? <>
        <section className="nv-card cm-mp-card" aria-labelledby="pw-payday-title">
          <Celebration kind="PAYDAY_AVAILABLE" eventKey={latest.id} confirmed={latest.published} />
          <div className="nv-card__head"><h2 className="nv-card__title">Latest statement</h2></div>
          <div className="nv-card__body cm-mp-latest">
            <div className="cm-mp-latest__copy">
              <h3 id="pw-payday-title" className="cm-mp-latest__day"><span className="nv-sr">Payday </span>{longDay(latest.payday)}</h3>
              <p className="cm-mp-muted">{periodLabel(latest.period.startDate, latest.period.endDate)} · PDF<span className="nv-sr">, published pay statement</span></p>
            </div>
            <div className="cm-mp-latest__actions">
              {latest.viewUrl ? <a className="nv-btn" data-kind="secondary" href={`${documentHref(latest)}/view`}>View<span className="nv-sr"> statement, payday {longDay(latest.payday)}</span></a> : null}
              <a className="nv-btn" data-kind="primary" href={documentHref(latest)} aria-label={`Download statement, payday ${longDay(latest.payday)}`}><DownloadSimpleIcon size={18} aria-hidden="true" />Download</a>
            </div>
          </div>
        </section>
        {statements.length > 1 ? <section className="nv-card cm-mp-card" id="pw-earlier" aria-labelledby="pw-earlier-title">
          <div className="nv-card__head"><h2 className="nv-card__title" id="pw-earlier-title">Earlier statements</h2></div>
          <ul className="nv-rows">{statements.slice(1).map(statement => <li key={statement.id}>
            <div className="nv-row">
              <span className="nv-row__text"><span className="nv-row__title">{longDay(statement.payday)}</span><span className="nv-row__meta">{periodLabel(statement.period.startDate, statement.period.endDate)} · PDF</span></span>
              <a className="cm-mp-download" href={documentHref(statement)} aria-label={`Download statement, payday ${longDay(statement.payday)}`}><DownloadSimpleIcon size={20} aria-hidden="true" /></a>
            </div>
          </li>)}</ul>
        </section> : null}
      </>
      : <section className="nv-card cm-mp-card" role="status">
        <div className="nv-card__body"><p className="cm-mp-strong">No published statements yet</p><p className="cm-mp-muted">Your pay statements will appear when your company publishes them. Contact your payroll administrator if a statement is missing.</p></div>
      </section>}

      <p className="cm-page-foot cm-mp-foot">
        <span className="cm-mp-privacy"><LockSimpleIcon size={15} aria-hidden="true" />Only your statements appear here. Files can include personal pay details.</span>
        {error ? null : <button type="button" className="cm-refresh" disabled={loading} onClick={() => void reload()}>Refresh<span className="nv-sr"> statements</span></button>}
      </p>
    </div>
  </div>;
}
