'use client';

import { readStatements } from './api';
import { usePayrollResource } from './use-payroll';
import { DocumentLink, PayrollFrame, PayrollPanel, PayrollState, PrivacyNote } from './payroll-ui';
import { formatDateRange, formatDisplayDate } from '@/lib/date-utils';
import { Illustration } from '../illustrations';
import type { PayrollStatementsResponse } from '@/lib/payroll/contracts';

/** The newest published statement, made the page's moment. Statements carry no
 * amounts, so it shows the payday and the provider's document, never figures. */
export function PaydayMoment({ statement }: { statement: PayrollStatementsResponse['statements'][number] }) {
  return <section className="pw-payday" aria-labelledby="pw-payday-title">
    <Illustration name="payday" size={96} className="pw-payday-art" />
    <div className="pw-payday-copy">
      <p className="pw-payday-kicker">Latest statement</p>
      <h2 id="pw-payday-title">Payday {formatDisplayDate(statement.payday)}</h2>
      <p>{formatDateRange(statement.period.startDate, statement.period.endDate)} · From your payroll provider</p>
      <DocumentLink document={statement} />
    </div>
  </section>;
}

const newestFirst = (a: { payday: string }, b: { payday: string }) => b.payday.localeCompare(a.payday);

export function MyPay() {
  const { data, loading, error, reload } = usePayrollResource('/api/payroll/statements', readStatements);
  return <PayrollFrame title="My pay" description="Your published pay statements, ready to view or download." personal>
    <PayrollPanel title="Pay statements" description="Statements appear here after payroll publishes them." aside={<button className="pw-button pw-secondary" disabled={loading} onClick={() => void reload()}>Refresh</button>}>
      {loading && !data ? <PayrollState title="Loading your statements">Checking your private pay documents.</PayrollState> : error ? <PayrollState title="Statements unavailable" error retry={() => void reload()}>{error}</PayrollState> : data?.statements.length ? <>{[...data.statements].sort(newestFirst).slice(0, 1).map(statement => <PaydayMoment key={statement.id} statement={statement} />)}{data.statements.length > 1 ? <h3 className="pw-earlier">Earlier statements</h3> : null}<div className="pw-statements">{[...data.statements].sort(newestFirst).slice(1).map(statement => <section key={statement.id}><header><h3>{formatDateRange(statement.period.startDate, statement.period.endDate)}</h3><p>Payday {formatDisplayDate(statement.payday)}</p></header><DocumentLink document={statement} /></section>)}</div></> : <PayrollState title="No published statements yet">Your pay statements will appear when your company publishes them. Contact your payroll administrator if a statement is missing.</PayrollState>}
    </PayrollPanel><PrivacyNote>Only your own published statements are available here. Downloaded files may contain personal pay information.</PrivacyNote>
  </PayrollFrame>;
}
