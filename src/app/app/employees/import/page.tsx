import {readPageLang} from '@/lib/i18n/page-lang.server';
import {EMPLOYEES_COPY} from '../employees-copy';
import {scopedObservation} from '@/lib/company-access/observation';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {requireSession, requireSessionMutationProof} from '@/lib/auth/session';
import {isManagerRole} from '@/lib/auth/permissions';
import {commerceEnabled} from '@/lib/commerce/access';
import {listEmployees, listLocations} from '@/lib/data/employees';
import {rosterImportAvailable} from '@/lib/onboarding/roster-import-available.server';
import {CorpPage} from '@/components/corp/corp';
import {SheetMarker} from '@/components/team/team-forms';
import {OwnerOnlyNotice} from '@/components/owner-only-notice';
import {RosterImport} from '@/components/roster-import/roster-import';
import {rosterImportCopy} from '@/components/roster-import/copy';
import {headcountsOf} from '@/components/roster-import/contract';

export async function generateMetadata() { return { title: rosterImportCopy[await readPageLang()].title }; }

const TEAM_BACK = (lang: 'en' | 'es') => ({href: '/app/employees', label: EMPLOYEES_COPY[lang].team});

/** Owner roster import (docs/handoffs/2026-11-14-owner-simplicity.md): add your list, check it, import. Owners only, as
 * the routes are. The page's words follow the person's language (es-rest). */
export default async function RosterImportPage() {
  const session = await requireSession();
  const lang = await readPageLang();
  const copy = rosterImportCopy[lang];
  if (session.role !== 'OWNER') {
    const owners = await listEmployees().then(list => list.filter(employee => employee.role === 'OWNER' && employee.active !== false).map(employee => `${employee.firstName} ${employee.lastName}`.trim())).catch(() => []);
    // A Manager can still add people one at a time; that page is theirs.
    // Package X (Nov 23, 2026): the page sits under Team, so its band goes back to Team (it said "‹ Home"), as the form does.
    return <OwnerOnlyNotice lang={lang} title={copy.title} back={TEAM_BACK(lang)} reason={copy.closed.reason} help={copy.closed.help} ownersCan={copy.closed.ownersCan} owners={owners}
      next={isManagerRole(session.role) ? {href: '/app/employees/new', label: copy.closed.addOne} : undefined}/>;
  }
  if (!rosterImportAvailable()) return <OwnerOnlyNotice lang={lang} title={copy.title} back={TEAM_BACK(lang)} reason={copy.off.title} help={copy.off.line} next={{href: '/app/employees/new', label: copy.off.action}}/>;
  // The same company-wide read Add employee makes, plus the people the three headcounts are counted from.
  const source = await withOperationalCompany(await requireSessionMutationProof(), () => Promise.all([listLocations(), listEmployees()]));
  if (source.state === 'unavailable') return <OperationalUnavailable lang={lang} title={copy.sourceUnavailable} reason={source.reason}/>;
  const [locations, employees] = source.data;
  return (
    <ScopedReadFrame observation={scopedObservation(source)}><CorpPage className="c-addemp c-sheetpage c-rimp" labelledBy="roster-import-title">
      <SheetMarker />
      <RosterImport actorId={session.id} locations={locations.filter(location => location.active).map(location => ({id: location.id, name: location.shortName || location.name}))}
        headcounts={headcountsOf(employees)} billingHref={commerceEnabled() ? '/app/billing' : null}/>
    </CorpPage></ScopedReadFrame>
  );
}
