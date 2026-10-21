'use client';

import type { PayrollRun } from '@/lib/payroll/contracts';
import { readPortalStatements } from './api';
import { usePayrollResource } from './use-payroll';
import { DocumentLink, PayrollPanel, PayrollState } from './payroll-ui';

export function PortalStatements({ runs }: { runs: PayrollRun[] }) {
  const { data, loading, error, reload } = usePayrollResource('/api/payroll/portal-statements', readPortalStatements);
  return <PayrollPanel title="Private employee statements" description="History available to your current payroll and location access. Original statements remain available after a correction." aside={<button className="pw-button pw-secondary" disabled={loading} aria-label="Refresh private statements" onClick={() => void reload()}>Refresh</button>}>
    {loading ? <PayrollState title="Loading private statement history">Checking current access to employee documents.</PayrollState> : error ? <PayrollState title="Private statements unavailable" error retry={() => void reload()}>{error}</PayrollState> : data?.statements.length ? <div className="pw-statements">{data.statements.map(statement => {
      const run = runs.find(item => item.documents.some(document => document.id === statement.id));
      const name = run?.rows?.find(row => row.employeeId === statement.employeeId)?.employeeName;
      return <section key={statement.id}><header><h3>{name ?? statement.employeeId}</h3><p>{statement.period.startDate} – {statement.period.endDate} · Payday {statement.payday}{run && ` · Revision ${run.revision}`}</p></header>
        {run?.correctionOf && <p className="pw-notice">Linked correction · original run <code>{run.correctionOf}</code>{run.nativeCorrection && <><br />{run.nativeCorrection.reason}</>}</p>}
        <DocumentLink document={statement} />
      </section>;
    })}</div> : <PayrollState title="No employee statements available">Documents appear here after generation and only while your current access covers their full payroll context.</PayrollState>}
  </PayrollPanel>;
}
