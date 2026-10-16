import { CheckIcon } from '@phosphor-icons/react/ssr';
import type { PayrollRun } from '@/lib/payroll/contracts';
import { payrollReviewNotes } from './workflow-status';

export type PayrollStepState = 'done' | 'current' | 'blocked' | 'upcoming';
export type PayrollStep = { id: 'hours' | 'amounts' | 'review' | 'approve' | 'publish'; label: string; state: PayrollStepState; hint: string };

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** Where this run is, derived only from its own state: finalized time,
 * imported amounts, blocking exceptions, approval and published statements. */
export function payrollSteps(run: Pick<PayrollRun, 'status' | 'exceptions' | 'rows' | 'totals' | 'documents'>): PayrollStep[] {
  const { blocking } = payrollReviewNotes(run.exceptions);
  const openTime = blocking.filter(item => item.startsWith('TIME_NOT_FINALIZED:')).length;
  const otherBlocking = blocking.filter(item => !item.startsWith('TIME_NOT_FINALIZED:') && item !== 'WAITING_FOR_AMOUNTS').length;
  const statements = run.documents.filter(document => document.kind === 'EMPLOYEE_STATEMENT');
  const unpublished = statements.filter(document => !document.published).length;
  const approved = run.status === 'APPROVED';
  const amounts = run.status !== 'WAITING_FOR_AMOUNTS' && !!run.rows && !!run.totals;
  const hoursDone = openTime === 0;
  const reviewDone = approved || (amounts && hoursDone && otherBlocking === 0);
  const published = approved && statements.length > 0 && unpublished === 0;
  const steps: PayrollStep[] = [
    { id: 'hours', label: 'Hours', state: hoursDone ? 'done' : 'blocked', hint: hoursDone ? 'Timecards finalized' : `${plural(openTime, 'timecard', 'timecards')} to finalize` },
    { id: 'amounts', label: 'Amounts', state: amounts ? 'done' : 'upcoming', hint: amounts ? 'Imported from your provider' : 'Import provider amounts' },
    { id: 'review', label: 'Review', state: reviewDone ? 'done' : otherBlocking ? 'blocked' : 'upcoming', hint: reviewDone ? 'Ready to approve' : otherBlocking ? `${plural(otherBlocking, 'item', 'items')} to resolve` : 'Check every employee' },
    { id: 'approve', label: 'Approve', state: approved ? 'done' : 'upcoming', hint: approved ? 'Approval recorded' : 'Approve this revision' },
    { id: 'publish', label: 'Publish', state: published ? 'done' : 'upcoming', hint: published ? 'Employees can see their pay' : statements.length ? `${plural(unpublished, 'statement', 'statements')} to publish` : approved ? 'Statements are being prepared' : 'Statements appear after approval' },
  ];
  // The first unfinished step is where to work now (unless it is blocked).
  const next = steps.find(step => step.state !== 'done');
  if (next && next.state === 'upcoming') next.state = 'current';
  return steps;
}

export function PayrollStepper({ run }: { run: Parameters<typeof payrollSteps>[0] }) {
  const steps = payrollSteps(run);
  const active = steps.find(step => step.state === 'current' || step.state === 'blocked');
  return <div className="pw-stepper-wrap">
    <ol className="pw-stepper" aria-label="Payroll progress">
      {steps.map((step, index) => <li key={step.id} data-state={step.state} aria-current={step === active ? 'step' : undefined}>
        <span className="pw-step-dot" aria-hidden="true">{step.state === 'done' ? <CheckIcon size={14} weight="bold" /> : index + 1}</span>
        <span className="pw-step-label">{step.label}<span className="sr-only">: {step.state === 'done' ? 'done' : step.state === 'blocked' ? 'needs attention' : step.state === 'current' ? 'in progress' : 'not started'}. {step.hint}.</span></span>
      </li>)}
    </ol>
    <p className="pw-stepper-hint" aria-hidden="true">{active ? <><strong>{active.label}:</strong> {active.hint}</> : <><strong>Done:</strong> Employees can see their pay</>}</p>
  </div>;
}
