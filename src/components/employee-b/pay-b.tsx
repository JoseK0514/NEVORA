'use client';

import type {ReactNode, RefObject} from 'react';
import {ArrowSquareOutIcon} from '@phosphor-icons/react/dist/ssr/ArrowSquareOut';
import {ClockIcon} from '@phosphor-icons/react/dist/ssr/Clock';
import {FileTextIcon} from '@phosphor-icons/react/dist/ssr/FileText';
import {ReceiptIcon} from '@phosphor-icons/react/dist/ssr/Receipt';
import {BEmpty} from './requests-b';
import {ClockCounterClockwiseIcon} from '@phosphor-icons/react/dist/ssr/ClockCounterClockwise';
import {BButtonLink, BCard, BChip, BHero, BList, BNote, BRow, BScreen, BStack} from '../owner-b/b-kit';
import type {PayView} from '../employee-mobile/pay';
import {BAddRow} from './parts';
import './pay.css';

/* Employee Pay on the phone, Direction B (Jose approved the mock, Nov 6, 2026): money gets the dark ink hero. Statements
 * carry no amounts, hours or deposit details, so the screens show paydays, periods and the provider's PDF, never figures;
 * a scheduled payday is never called a payment. Presentation only: the corporate view's read, states, links, arrival
 * notices and focus rules; this screen shows on phones. */

type Statement = NonNullable<PayView['statements']>[number];
const utc = (date: string) => new Date(`${date}T12:00:00Z`);
const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', {timeZone: 'UTC', ...options});
const payday = (date: string) => fmt({weekday: 'short', month: 'short', day: 'numeric'}).format(utc(date));
const paydayLong = (date: string) => fmt({weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'}).format(utc(date));
const period = (start: string, end: string) => { const short = (date: string) => fmt({month: 'short', day: 'numeric'}).format(utc(date)); return start.slice(0, 7) === end.slice(0, 7) ? `${short(start)} – ${Number(end.slice(8))}` : `${short(start)} – ${short(end)}`; };
const paycheckHref = (id: string) => `/app/my-pay?paycheck=${encodeURIComponent(id)}`;
const documentHref = (statement: Statement) => `/api/payroll/documents/${encodeURIComponent(statement.id)}`;
const role = (item: Statement) => item.correctedBy ? 'replaced statement' : item.corrects ? 'corrected statement' : 'statement';
const tag = (item: Statement) => item.correctedBy ? <BChip tone="grey">Replaced</BChip> : item.corrects ? <BChip tone="grey">Correction</BChip> : null;

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
};

function Row({item}: {item: Statement}) {
  return <BRow href={paycheckHref(item.id)} title={payday(item.payday)} chip={tag(item)} sub={`For work ${period(item.period.startDate, item.period.endDate)}`}
    label={`${paydayLong(item.payday)}, ${role(item)} for ${period(item.period.startDate, item.period.endDate)}`}/>;
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
  const {view, state, ordered, byId, paycheck, nextPay, daysUntil, listed, thisYear, notice, noticeRef, status, onOpenPdf} = props;
  const ready = state === 'ready';
  const loading = state === 'loading';
  const empty = state === 'empty';
  const surface = status ? <StatusCard status={status} state={state}/> : null;
  const loadingCard = <BCard title={view === 'history' ? 'Pay history' : 'Recent pay'}><p className="b-state" role="status">Loading your statements…</p></BCard>;
  const emptyCard = <BCard label="Recent pay"><BEmpty icon={<ReceiptIcon weight="bold"/>} title="No published statements yet" sub="Your statements appear here after your workplace publishes payroll."/></BCard>;
  const fallback = loading ? loadingCard : empty ? emptyCard : surface;

  if (view === 'paycheck') {
    const item = paycheck ? byId.get(paycheck) : undefined;
    return <BScreen ink back>
      <BHero back={{href: '/app/my-pay', label: 'Pay'}} title="Paycheck" titleId="b-pay-page-title" sub={item ? `For work ${period(item.period.startDate, item.period.endDate)}` : undefined}/>
      <BStack>
        {!ready ? fallback : !item ? <BCard label="Paycheck"><div className="ep-status" role="status"><h2 className="ep-status__t">That statement isn’t available</h2><p className="ep-status__s">It may have been replaced, or your access changed.</p></div></BCard> : <>
          <BCard id="b-pay-paycheck" title={`Pay period ${period(item.period.startDate, item.period.endDate)}`} chip={tag(item) ?? undefined}>
            <div className="ep-big"><p className="ep-big__k">Payday</p>
              <p className="ep-big__v">{fmt({weekday: 'short', month: 'short', day: 'numeric', ...(item.payday.slice(0, 4) === thisYear ? {} : {year: 'numeric'})}).format(utc(item.payday))}</p>
              {item.correctedBy ? <p className="ep-big__s">A corrected statement replaced this one. Use the corrected statement for this period.</p>
                : item.corrects ? <p className="ep-big__s">This corrects your earlier statement for the same period.</p> : null}</div>
            <BList label="Statement">
              {item.correctedBy && byId.has(item.correctedBy) ? <BRow href={paycheckHref(item.correctedBy)} title="Use the corrected statement" label="Use the corrected statement"/> : null}
              <li className="b-li"><a id={`b-pay-pdf-${item.id}`} className="b-add ep-pdf" href={item.viewUrl ? `${documentHref(item)}/view` : documentHref(item)} {...(item.viewUrl ? {target: '_blank', rel: 'noopener'} : {})}
                aria-label={`Pay statement (PDF), ${role(item)}, payday ${paydayLong(item.payday)}${item.viewUrl ? ' (opens separately)' : ''}`} onClick={() => onOpenPdf(`b-pay-pdf-${item.id}`)}>
                <span className="b-ico b-ico--teal" aria-hidden="true"><FileTextIcon weight="bold"/></span><span className="ep-pdf__t">Pay statement (PDF)</span><ArrowSquareOutIcon className="ep-pdf__out" size={18} weight="bold" aria-hidden="true"/></a></li>
            </BList>
          </BCard>
          <BNote>Downloaded files may contain personal pay information.</BNote>
        </>}
      </BStack>
    </BScreen>;
  }

  if (view === 'history') {
    const months = new Map<string, Statement[]>();
    for (const item of ordered) { const key = item.payday.slice(0, 7); months.set(key, [...(months.get(key) ?? []), item]); }
    return <BScreen ink back>
      <BHero back={{href: '/app/my-pay', label: 'Pay'}} title="Pay history" titleId="b-pay-page-title" sub={ready ? 'Your published pay statements, newest first' : undefined}/>
      <BStack>
        {!ready ? fallback : <>
          {[...months].map(([month, items]) => <BCard key={month} title={fmt({month: 'long', ...(month.slice(0, 4) === thisYear ? {} : {year: 'numeric'})}).format(utc(`${month}-15`))}>
            <BList>{items.map(item => <Row key={item.id} item={item}/>)}</BList>
          </BCard>)}
          <BNote>Open a statement to download its PDF. Downloaded files may contain personal pay information.</BNote>
        </>}
      </BStack>
    </BScreen>;
  }

  const latest = ready ? ordered[0] : null, earlier = ready ? ordered.slice(1, 3) : [];
  const showPayday = !!nextPay && listed && daysUntil !== null && daysUntil >= 0;
  const when = daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`;
  return <BScreen ink>
    {/* Desktop: Pay history is the band's glass action (eb-desk); the phone reaches it from the Earlier card. */}
    <BHero title="Pay" titleId="b-pay-title" right={<span className="eb-desk"><BButtonLink href="/app/my-pay?view=history" kind="glass"><ClockCounterClockwiseIcon size={16} weight="bold" aria-hidden="true"/>Pay history</BButtonLink></span>}>
      {showPayday ? <div className="b-hpad ep-next">
        <p className="ep-next__k">Next payday · {when}</p>
        <p className="ep-next__v">{payday(nextPay!.payday)}</p>
        <div className="ep-next__row">
          {nextPay!.period ? <span className="b-chip b-chip--ok">For work {period(nextPay!.period.startDate, nextPay!.period.endDate)}</span> : null}
          <BButtonLink href="/app/my-time" kind="glass" label="See your hours"><ClockIcon size={15} weight="bold" aria-hidden="true"/>See your hours</BButtonLink>
        </div>
      </div> : null}
    </BHero>
    <BStack>
      {notice && listed && !loading ? <div ref={noticeRef} tabIndex={-1} className="b-card ep-notice" role="alert" aria-labelledby="b-pay-notice-title">
        <p className="ep-status__t" id="b-pay-notice-title">{notice.title}</p><p className="ep-status__s">{notice.body}</p>
      </div> : null}
      {latest ? <BCard id="b-pay-last" title="Last paycheck" chip={tag(latest) ?? undefined}>
        <div className="ep-big"><p className="ep-big__v">{payday(latest.payday)}</p><p className="ep-big__s">For work {period(latest.period.startDate, latest.period.endDate)}</p></div>
        <BList><BAddRow href={paycheckHref(latest.id)} icon={<FileTextIcon weight="bold"/>} label={`View statement, ${paydayLong(latest.payday)}`}>View statement</BAddRow></BList>
      </BCard> : fallback}
      {earlier.length ? <BCard id="b-pay-recent" title="Earlier" link={ordered.length > 3 ? {href: '/app/my-pay?view=history', label: 'See all', aria: 'See all pay'} : undefined}>
        <BList label="Earlier pay">{earlier.map(item => <Row key={item.id} item={item}/>)}</BList>
      </BCard> : latest ? <BCard label="Pay history"><BList><BRow href="/app/my-pay?view=history" title="Pay history" sub="Every published statement"/></BList></BCard> : null}
      {latest ? <BNote>Open a statement to download its PDF. Downloaded files may contain personal pay information.</BNote> : null}
    </BStack>
  </BScreen>;
}
