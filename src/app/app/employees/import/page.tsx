import {scopedObservation} from '@/lib/company-access/observation';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {requireSession, requireSessionMutationProof} from '@/lib/auth/session';
import {isManagerRole} from '@/lib/auth/permissions';
import {commerceEnabled} from '@/lib/commerce/access';
import {listEmployees, listLocations} from '@/lib/data/employees';
import {readWorkspaceRoutingConfig} from '@/lib/workspace-routing/config.server';
import {CorpPage} from '@/components/corp/corp';
import {SheetMarker} from '@/components/team/team-forms';
import {OwnerOnlyNotice} from '@/components/owner-only-notice';
import {RosterImport} from '@/components/roster-import/roster-import';
import {rosterImportCopy} from '@/components/roster-import/copy';
import {headcountsOf} from '@/components/roster-import/contract';
import {readPortalLanguage} from '@/lib/activation/language.server';

export const metadata = { title: "Import a staff list" };

const TEAM_BACK = {href: '/app/employees', label: 'Team'};

/** The roster routes (POST /api/onboarding/roster and /preview) answer only where company workspaces are routed: they
 * read the same configuration first and answer "unavailable" (HTTP 503) without it. The page asks the same question
 * before it draws a form, so a deployment without the import says so instead of failing on the first check. */
function rosterImportAvailable() {
  try { readWorkspaceRoutingConfig(); return true; } catch { return false; }
}

/** Owner roster import (docs/handoffs/2026-11-14-owner-simplicity.md): add your list, check it, import. Owners only, as
 * the routes are. English for now, like every signed-in page; the Spanish copy is in the same module. */
export default async function RosterImportPage() {
  const session = await requireSession();
  const copy = rosterImportCopy[await requireSessionMutationProof().then(proof => readPortalLanguage(proof)).then(read => read.language, () => 'en' as const)];
  if (session.role !== 'OWNER') {
    const owners = await listEmployees().then(list => list.filter(employee => employee.role === 'OWNER' && employee.active !== false).map(employee => `${employee.firstName} ${employee.lastName}`.trim())).catch(() => []);
    // A Manager can still add people one at a time; that page is theirs.
    // Package X (Nov 23, 2026): the page sits under Team, so its band goes back to Team (it said "‹ Home"), as the form does.
    return <OwnerOnlyNotice title={copy.title} back={TEAM_BACK} reason={copy.closed.reason} help={copy.closed.help} ownersCan={copy.closed.ownersCan} owners={owners}
      next={isManagerRole(session.role) ? {href: '/app/employees/new', label: copy.closed.addOne} : undefined}/>;
  }
  if (!rosterImportAvailable()) return <OwnerOnlyNotice title={copy.title} back={TEAM_BACK} reason={copy.off.title} help={copy.off.line} next={{href: '/app/employees/new', label: copy.off.action}}/>;
  // The same company-wide read Add employee makes, plus the people the three headcounts are counted from.
  const source = await withOperationalCompany(await requireSessionMutationProof(), () => Promise.all([listLocations(), listEmployees()]));
  if (source.state === 'unavailable') return <OperationalUnavailable title={copy.sourceUnavailable} reason={source.reason}/>;
  const [locations, employees] = source.data;
  return (
    <ScopedReadFrame observation={scopedObservation(source)}><CorpPage className="c-addemp c-sheetpage c-rimp" labelledBy="roster-import-title">
      <SheetMarker />
      <RosterImport actorId={session.id} locations={locations.filter(location => location.active).map(location => ({id: location.id, name: location.shortName || location.name}))}
        headcounts={headcountsOf(employees)} billingHref={commerceEnabled() ? '/app/billing' : null}/>
    </CorpPage></ScopedReadFrame>
  );
}
