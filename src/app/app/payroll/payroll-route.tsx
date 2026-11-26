import { notFound } from 'next/navigation';
import { requireSessionMutationProof } from '@/lib/auth/session';
import { payrollFeatureEnabled, readPayrollCapabilities } from '@/lib/payroll/service';
import { PayrollRuns, type PayrollView } from '@/components/payroll/payroll-runs';
import { getWorkspace } from '@/lib/data/workspaces';
import { listEmployees } from '@/lib/data/employees';
import { payrollRecoveryScope } from '@/components/payroll/recovery-scope';
import { OwnerOnlyNotice, closedPayrollForManager, ownerNames } from '@/components/owner-only-notice';
import { readOperationalAuthority } from '@/lib/company-access/operational-scope.server';
import { currentBrand } from '@/lib/workspace-presentation/current.server';
import { navigationForRole } from '@/lib/navigation';
import { currentPayPeriod } from '@/lib/payroll/pay-calendar.server';
import { payrollTabs } from '@/components/payroll/payroll-tabs';
import { CorpPage } from '@/components/corp/corp';
import { SheetMarker } from '@/components/team/team-forms';
import { PayrollImportFlow } from '@/components/payroll-import/import-flow';
import { workCopy } from '@/components/employee-b/work-copy';
import './payroll-workflow.css';
import { readPageLang } from '@/lib/i18n/page-lang.server';
import { ROUTE_COPY } from '../route-copy';

/** Every Payroll page (Release 1): the same access check, then one view of the payroll workspace. The review pages are
 * their own URLs so a phone shows them as pushed pages (‹ Payroll) and Back returns where it should. */
async function ownerNamesFor() {
  return listEmployees().then(list => list.filter(employee => employee.role === 'OWNER' && employee.active !== false).map(employee => `${employee.firstName} ${employee.lastName}`.trim())).catch(() => []);
}

export async function PayrollRoute({ view, runId = null }: { view: PayrollView; runId?: string | null }) {
  const lang = await readPageLang(), t = ROUTE_COPY[lang];
  if (!payrollFeatureEnabled()) notFound();
  const proof = await requireSessionMutationProof();
  const capabilities = await readPayrollCapabilities(proof);
  // PD9 / UX10: someone without payroll access who opens the link is told why, instead of a silent move to Home.
  // Review B2 (NV-137): the notice names who can help (the workspace's Owners, from the team list the person already sees).
  if (!capabilities.canReview) {
    const owners = await ownerNamesFor();
    // Review Nov 11 (MG-002): a Manager is pointed to their part of the job (Timecards) and to their own pay, each only
    // when their navigation has it (the rule More and the shell use). An Employee or Lead keeps the notice as it was.
    if (proof.employee.role === 'MANAGER') {
      // A read that fails leaves the notice without its two ways on; it never opens Payroll.
      const navigation = await Promise.all([readOperationalAuthority(proof), currentBrand()])
        .then(([operational, brand]) => navigationForRole('MANAGER', capabilities, { operational, modules: brand.modules })).catch(() => []);
      // Phase 8 (B #22, #23): a name never breaks across two lines; "or" between two names still may.
      const closed = closedPayrollForManager(href => navigation.some(item => item.href === href), ownerNames(owners.map(name => name.replace(/ /g, '\u00A0')), lang), lang);
      return <OwnerOnlyNotice state lang={lang} title={t.payroll} reason={t.payrollForOwners} line={closed.line} next={closed.next} also={closed.also} />;
    }
    // Phase 8 (review C, row 12): an Employee or Lead gets the same state screen, and their own pay is the way on when
    // their navigation has Pay (the rule More and the shell use); otherwise the notice names who can help, as before.
    const navigation = await currentBrand().then(brand => navigationForRole(proof.employee.role, capabilities, { modules: brand.modules })).catch(() => []);
    if (navigation.some(item => item.href === '/app/my-pay')) {
      return <OwnerOnlyNotice state lang={lang} title={t.payroll} reason={t.payrollForOwners} line={workCopy(lang).payIsInPay} next={{ href: '/app/my-pay', label: workCopy(lang).openPay }} />;
    }
    return <OwnerOnlyNotice state lang={lang} title={t.payroll} reason={t.payrollForOwners} help={t.ownersCanGive} ownersCan={t.giveAccess} owners={owners} />;
  }
  const workspace = await getWorkspace();
  const recoveryScope = payrollRecoveryScope(workspace.id, proof.employee.id);
  // U01: importing pay from another payroll system is its own step-by-step page, behind the same access check as every
  // Payroll page above (a Manager without the grant has already been shown the closed-page card).
  if (view === 'import') return <CorpPage className="c-addemp c-sheetpage c-pim" labelledBy="payroll-import-title">
    <SheetMarker />
    <PayrollImportFlow lang={lang} key={`${recoveryScope}:${runId ?? ''}`} runId={runId} recoveryScope={recoveryScope} actorId={proof.employee.id} />
  </CorpPage>;
  const current = await currentPayPeriod().catch(() => null);
  // Names for the people a review, fix list or Pay history statement refers to by reference (no pay data; the team list
  // the Owner already sees). Pay history uses them to name each statement's employee from its record, never its file name.
  const names = view === 'home' ? {} : await listEmployees().then(list => Object.fromEntries(list.map(employee => [employee.id, `${employee.firstName} ${employee.lastName}`.trim()]))).catch(() => ({}));
  return <PayrollRuns key={recoveryScope} recoveryScope={recoveryScope} current={current} canEditSettings={proof.employee.role === 'OWNER'}
    view={view} runId={runId} names={names} company={workspace.name} timeZone={workspace.timeZone} tabs={view === 'home' ? payrollTabs(proof.employee.role, capabilities) : null} />;
}

export type PayrollSearch = Promise<{ run?: string | string[] }>;
export async function runParam(searchParams: PayrollSearch) {
  const run = (await searchParams).run;
  return typeof run === 'string' && /^[A-Za-z0-9-]{1,64}$/.test(run) ? run : null;
}
