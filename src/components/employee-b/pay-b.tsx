'use client';

import Link from 'next/link';
import {dateRange} from '@/lib/duration-format';

import type {ReactNode, RefObject} from 'react';
import {ArrowSquareOutIcon} from '@phosphor-icons/react/dist/ssr/ArrowSquareOut';
import {ClockIcon} from '@phosphor-icons/react/dist/ssr/Clock';
import {FileTextIcon} from '@phosphor-icons/react/dist/ssr/FileText';
import {ReceiptIcon} from '@phosphor-icons/react/dist/ssr/Receipt';
import {BEmpty} from './requests-b';
import {ClockCounterClockwiseIcon} from '@phosphor-icons/react/dist/ssr/ClockCounterClockwise';
import {BButtonLink, BCard, BChip, BHero, BList, BNote, BRow, BScreen, BStack} from '../owner-b/b-kit';
import {PAY_DIFFERENCE_LINE, PAY_SCOPE_LINE, type PayView} from '../employee-mobile/pay';
import {workCopy} from './work-copy';
import {payCopy} from './pay-copy';
import {LOCALE,type FormatLang} from './es-format';
import {usePortalLang} from '@/lib/i18n/portal-lang';
import './pay.css';

/* Employee Pay on the phone, Direction B (Jose approved the mock, Nov 6, 2026): money gets the dark ink hero. Statements
 * carry no amounts, hours or deposit details, so the screens show paydays, periods and the provider's PDF, never figures;
 * a scheduled payday is never called a payment. Presentation only: the corporate view's read, states, links, arrival
 * notices and focus rules; this screen shows on phones. */

type Statement = NonNullable<PayView['statements']>[number];
const utc = (date: string) => new Date(`${date}T12:00:00Z`);
/* Signed-in Spanish (Nov 23, 2026): the words and the dates in the person's language ("Fri, Nov 20" / "vie, 20 nov"). */
function payWords(lang: FormatLang) {
  const P = payCopy(lang), locale = LOCALE[lang];
  // Spanish short forms drop Intl's abbreviation dots ("vie., 20 nov." → "vie, 20 nov"), as docs/design/voice.md writes them.
  const clean = (text: string) => lang === 'es' ? text.replace(/\./g, '') : text;
  const fmt = (options: Intl.DateTimeFormatOptions) => ({format: (date: Date) => clean(new Intl.DateTimeFormat(locale, {timeZone: 'UTC', ...options}).format(date))});
  return {P, lang, fmt,
    payday: (date: string) => fmt({weekday: 'short', month: 'short', day: 'numeric'}).format(utc(date)),
    paydayLong: (date: string) => fmt({weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'}).format(utc(date)),
    period: (start: string, end: string) => clean(dateRange(start, end, {year: 'never', locale})),
    role: (item: Statement) => item.correctedBy ? P.roleReplaced : item.corrects ? P.roleCorrected : P.roleStatement,
    // Review B6 (NV-155): the correction is the current statement ("Corrected", teal); the one it replaced is muted ("Replaced").
    tag: (item: Statement) => item.correctedBy ? <BChip tone="grey">{P.replaced}</BChip> : item.corrects ? <BChip tone="teal">{P.corrected}</BChip> : null};
}
type PayWords = ReturnType<typeof payWords>;
const paycheckHref = (id: string) => `/app/my-pay?paycheck=${encodeURIComponent(id)}`;
const documentHref = (statement: Statement) => `/api/payroll/documents/${encodeURIComponent(statement.id)}`;

export type PayBStatus = {title: string; body: string; action?: ReactNode; live: 'status' | 'alert'} | null;
export type PayBProps = {
  view: 'pay' | 'history' | 'paycheck';
  state: string;
  ordered: Statement[];
  byId: Map<string, Statement>;
  paycheck: string | null;
  nextPay: PayView['nextPay'];
  daysUntil: number | null;
  listed: boolean;
  thisYear: string;
  /** The arrival notice (a PDF that failed, or a statement that isn't there). */
  notice: {title: string; body: string} | null;
  noticeRef: RefObject<HTMLDivElement | null>;
  status: PayBStatus;
  onOpenPdf: (id: string) => void;
  /** Phase 2 (G10): an Owner's or Manager's My pay is this same screen with their own statements; it keeps their menu's
   * name and, on a phone, the way back to More. */
  home?: {title: string; back?: {href: string; label: string}};
};

// Sweep 1 (brief rule 7): a row's name is its visible text, so there is no aria-label that differs from it.
function Row({item, byId, w}: {item: Statement; byId?: Map<string, Statement>; w: PayWords}) {
  const {P, fmt, payday, period, tag} = w;
  const by = item.correctedBy ? byId?.get(item.correctedBy) : undefined;
  // Final polish, round 2 (P2): a statement whose correction is in the list is not a second payday. It reads "Earlier
  // version" over "Replaced by the Nov 13 correction" (the correction's payday), muted, with no chip (the line says it);
  // the correction keeps its date and "Corrected". Without the correction at hand it keeps its date and "Replaced".
  if (by) return <BRow href={paycheckHref(item.id)} title={<span className="ep-muted">{payday(item.payday)}</span>} sub={P.replacedBy(fmt({month: 'short', day: 'numeric'}).format(utc(by.payday)))}/>;
  return <BRow href={paycheckHref(item.id)} title={item.correctedBy ? <span className="ep-muted">{payday(item.payday)}</span> : payday(item.payday)} chip={tag(item)} sub={P.forWork(period(item.period.startDate, item.period.endDate))}/>;
}

function StatusCard({status, state}: {status: NonNullable<PayBStatus>; state: string}) {
  return <BCard label={status.title}>
    <div className="ep-status" role={status.live} aria-labelledby={`b-pay-${state}-title`}>
      <h2 className="ep-status__t" id={`b-pay-${state}-title`}>{status.title}</h2><p className="ep-status__s">{status.body}</p>
    </div>
    {status.action ? <div className="ep-status__act">{status.action}</div> : null}
  </BCard>;
}

export function PayB(props: PayBProps) {
  const {view, state, ordered, byId, paycheck, nextPay, daysUntil, listed, thisYear, notice, noticeRef, status, onOpenPdf, home} = props;
  const w = payWords(usePortalLang()), {P, fmt, payday, paydayLong, period, role, tag} = w;
  const title = home?.title ?? P.pay;
  const ready = state === 'ready';
  const loading = state === 'loading';
  const empty = state === 'empty';
  const surface = status ? <StatusCard status={status} state={state}/> : null;
  const loadingCard = <BCard title={view === 'history' ? P.payHistory : P.recentStatements}><p className="b-state" role="status">{P.loadingStatements}</p></BCard>;
  const emptyCard = <BCard label={P.recentStatements}><BEmpty icon={<ReceiptIcon weight="bold"/>} title={P.noStatements} sub={P.noStatementsSub}/></BCard>;
  const fallback = loading ? loadingCard : empty ? emptyCard : surface;

  if (view === 'paycheck') {
    const item = paycheck ? byId.get(paycheck) : undefined;
    return <BScreen ink back>
      <BHero back={{href: '/app/my-pay', label: title}} title={P.payStatement} titleId="b-pay-page-title" sub={item ? P.forWork(period(item.period.startDate, item.period.endDate)) : undefined}/>
      <BStack>
        {!ready ? fallback : !item ? <BCard label={P.payStatement}><div className="ep-status" role="status"><h2 className="ep-status__t">{P.notAvailable}</h2><p className="ep-status__s">{P.notAvailableSub}</p></div></BCard> : <>
          <BCard id="b-pay-paycheck" title={P.payPeriod(period(item.period.startDate, item.period.endDate))} chip={tag(item) ?? undefined}>
            <div className="ep-big"><p className="ep-big__k">{P.payday}</p>
              <p className="ep-big__v">{fmt({weekday: 'short', month: 'short', day: 'numeric', ...(item.payday.slice(0, 4) === thisYear ? {} : {year: 'numeric'})}).format(utc(item.payday))}</p>
              {item.correctedBy ? <p className="ep-big__s">{P.replacedLine}</p>
                : item.corrects ? <p className="ep-big__s">{P.correctsLine}</p> : null}
              {/* Inspection Nov 14 (PY-11): a correction can change the amount; say whom to ask. */}
              {item.correctedBy || item.corrects ? <p className="ep-big__s">{PAY_DIFFERENCE_LINE}</p> : null}</div>
            <BList label={P.statement}>
              {item.correctedBy && byId.has(item.correctedBy) ? <BRow href={paycheckHref(item.correctedBy)} title={P.useCorrected} label={P.useCorrected}/> : null}
              <li className="b-li"><a id={`b-pay-pdf-${item.id}`} className="b-add ep-pdf" href={item.viewUrl ? `${documentHref(item)}/view` : documentHref(item)} {...(item.viewUrl ? {target: '_blank', rel: 'noopener'} : {})}
                aria-label={P.pdfLabel(role(item), paydayLong(item.payday), !!item.viewUrl)} onClick={() => onOpenPdf(`b-pay-pdf-${item.id}`)}>
                <span className="b-ico b-ico--teal" aria-hidden="true"><FileTextIcon weight="bold"/></span><span className="ep-pdf__t">{P.pdf}</span><ArrowSquareOutIcon className="ep-pdf__out" size={18} weight="bold" aria-hidden="true"/></a></li>
            </BList>
            {/* Phase 9 (spec 3.2): the note qualifies the PDF above it, so it is this card's footer, not a line under it. */}
            <BNote>{P.downloadNote}</BNote>
          </BCard>
        </>}
      </BStack>
    </BScreen>;
  }

  if (view === 'history') {
    const monthName = (month: string) => fmt({month: 'long', ...(month.slice(0, 4) === thisYear ? {} : {year: 'numeric'})}).format(utc(`${month}-15`));
    const months = new Map<string, Statement[]>();
    for (const item of ordered) { const key = item.payday.slice(0, 7); months.set(key, [...(months.get(key) ?? []), item]); }
    return <BScreen ink back>
      <BHero back={{href: '/app/my-pay', label: title}} title={P.payHistory} titleId="b-pay-page-title" sub={ready ? P.historySub : undefined}/>
      <BStack>
        {!ready ? fallback : <>
          {[...months].map(([month, items]) => <BCard key={month} title={monthName(month)}>
            <BList>{items.map(item => <Row key={item.id} item={item} byId={byId} w={w}/>)}</BList>
          </BCard>)}
          {/* Desktop: one table grouped by month (eb-desk); the month cards above are the phone's. No amounts, as on the phone. */}
          {months.size ? <section className="b-card eb-desk eb-paytable" aria-labelledby="b-pay-page-title"><table>
            <thead><tr><th scope="col">{P.payday}</th><th scope="col">{P.forWorkHead}</th><th scope="col"><span className="b-sr">{P.kind}</span></th><th scope="col"><span className="b-sr">{P.statement}</span></th></tr></thead>
            {[...months].map(([month, items]) => <tbody key={month}>
              <tr className="eb-paytable__m"><th scope="rowgroup" colSpan={4}>{monthName(month)}</th></tr>
              {items.map(item => <tr key={item.id}><th scope="row">{payday(item.payday)}</th><td>{period(item.period.startDate, item.period.endDate)}</td><td>{tag(item)}</td>
                <td><Link className="eb-paytable__a" href={paycheckHref(item.id)} aria-label={P.viewStatementFor(paydayLong(item.payday), role(item), period(item.period.startDate, item.period.endDate))}>{P.viewStatement}</Link></td></tr>)}
            </tbody>)}
          </table></section> : null}
          <BNote>{P.openToDownload}</BNote>
        </>}
      </BStack>
    </BScreen>;
  }

  // Phase 4 (EM-025): tablets and desktop have room for five earlier statements; phones keep two and "See all".
  const latest = ready ? ordered[0] : null, earlier = ready ? ordered.slice(1, 3) : [], earlierWide = ready ? ordered.slice(3, 6) : [];
  const showPayday = !!nextPay && listed && daysUntil !== null && daysUntil >= 0;
  const when = daysUntil === 0 ? P.today : daysUntil === 1 ? P.tomorrow : P.inDays(daysUntil ?? 0);
  return <BScreen ink>
    {/* Final polish, round 2 (P1): See your hours is the band's action on the title's row at every width, as Past timecards
      * is on Time. Desktop: Pay history follows it there (eb-desk); the phone reaches it from the Earlier card. */}
    <BHero title={title} titleId="b-pay-title" back={home?.back} right={<>
      {showPayday ? <BButtonLink href="/app/my-time" kind="glass" label={P.seeHours}><ClockIcon size={16} weight="bold" aria-hidden="true"/>{P.seeHours}</BButtonLink> : null}
      <span className="eb-desk"><BButtonLink href="/app/my-pay?view=history" kind="glass"><ClockCounterClockwiseIcon size={16} weight="bold" aria-hidden="true"/>{P.payHistory}</BButtonLink></span>
    </>}>
      {/* Phase 4 (EM-010): the period is plain band text under the date, not a chip. */}
      {showPayday ? <div className="b-hpad ep-next">
        <div className="ep-next__tx">
          <p className="ep-next__k">{P.scheduledPayday(when)}</p>
          <p className="ep-next__v">{payday(nextPay!.payday)}</p>
          {nextPay!.period ? <p className="ep-next__p">{P.forWork(period(nextPay!.period.startDate, nextPay!.period.endDate))}</p> : null}
        </div>
      </div> : null}
    </BHero>
    <BStack>
      {notice && listed && !loading ? <div ref={noticeRef} tabIndex={-1} className="b-card ep-notice" role="alert" aria-labelledby="b-pay-notice-title">
        <p className="ep-status__t" id="b-pay-notice-title">{notice.title}</p><p className="ep-status__s">{notice.body}</p>
      </div> : null}
      {/* Inspection Nov 14 (EM-003): the card says its state ("Statement ready", or Corrected) and ends in one real button. */}
      {latest ? <BCard id="b-pay-last" title={P.lastStatement} chip={tag(latest) ?? <BChip tone="green" icon="check">{P.statementReady}</BChip>}>
        <div className="ep-big"><p className="ep-big__v">{payday(latest.payday)}</p><p className="ep-big__s">{P.forWork(period(latest.period.startDate, latest.period.endDate))}</p></div>
        <div className="ep-act"><BButtonLink href={paycheckHref(latest.id)} kind="teal" full label={P.viewStatementOn(paydayLong(latest.payday))}><FileTextIcon size={18} weight="bold" aria-hidden="true"/>{P.viewStatement}</BButtonLink></div>
      </BCard> : fallback}
      {earlier.length ? <BCard id="b-pay-recent" title={P.earlier} link={ordered.length > 3 ? {href: '/app/my-pay?view=history', label: P.seeAll, aria: P.seeAllStatements} : undefined}>
        <BList label={P.earlierStatements}>{earlier.map(item => <Row key={item.id} item={item} byId={byId} w={w}/>)}</BList>
        {earlierWide.length ? <ul className="b-list eb-desk" aria-label={workCopy(w.lang).moreEarlierStatements}>{earlierWide.map(item => <Row key={item.id} item={item} byId={byId} w={w}/>)}</ul> : null}
      </BCard> : latest ? <BCard label={P.payHistory}><BList><BRow href="/app/my-pay?view=history" title={P.payHistory} sub={P.everyStatement}/></BList></BCard> : null}
      {/* Inspection Nov 14 (PY-7): a scheduled payday is not a payment from NEVORA; one quiet line says who pays. */}
      {listed ? <BNote>{PAY_SCOPE_LINE}</BNote> : null}
      {latest ? <BNote>{P.openToDownload}</BNote> : null}
    </BStack>
  </BScreen>;
}
