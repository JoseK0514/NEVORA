'use client';

import { readStatements } from './api';
import { usePayrollResource } from './use-payroll';
import { DocumentLink, PayrollFrame, PayrollPanel, PayrollState, PrivacyNote } from './payroll-ui';

export function MyPay() {
  const { data, loading, error, reload } = usePayrollResource('/api/payroll/statements', readStatements);
  return <PayrollFrame title="My pay" description="Your published pay statements, ready to view or download." personal>
    <PayrollPanel title="Pay statements" description="Statements appear here after payroll publishes them." aside={<button className="pw-button pw-secondary" disabled={loading} onClick={() => void reload()}>Refresh</button>}>
      {loading ? <PayrollState title="Loading your statements">Checking your private pay documents.</PayrollState> : error ? <PayrollState title="Statements unavailable" error retry={() => void reload()}>{error}</PayrollState> : data?.statements.length ? <div className="pw-statements">{data.statements.map(statement => <section key={statement.id}><header><h3>{statement.period.startDate} – {statement.period.endDate}</h3><p>Payday {statement.payday}</p></header><DocumentLink document={statement} /></section>)}</div> : <PayrollState title="No published statements yet">Your pay statements will appear when your company publishes them. Contact your payroll administrator if a statement is missing.</PayrollState>}
    </PayrollPanel><PrivacyNote>Only your own published statements are available here. Downloaded files may contain personal pay information.</PrivacyNote>
  </PayrollFrame>;
}
