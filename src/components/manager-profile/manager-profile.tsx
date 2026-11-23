import Link from 'next/link';
import { QuietNav } from '@/components/quiet/quiet';
import { getWorkspace } from '@/lib/data/workspaces';
import { navigationForRole } from '@/lib/navigation';
import { headers } from 'next/headers';
import { readNotificationConfig } from '@/lib/notifications/config';
import { readNativeRegistrationConfig } from '@/lib/native-push/config';
import { nativeContext } from '@/lib/native-shell/context';
import { payrollFeatureEnabled } from '@/lib/payroll/service';
import type { SessionMutationProof } from '@/lib/shift-changes/types';
import { timeZoneLabel } from '@/lib/time-zone-label';
import { currentBrand } from '@/lib/workspace-presentation/current.server';
import { readManagementProfile } from '@/lib/data/management-profile.server';
import { parseManagerProfile } from './contract';
import { ManagerProfileLive } from './manager-profile-live';
import { listEmployees } from '@/lib/data/employees';
import { ownerNames } from '@/components/owner-only-notice';
import { wordPreset } from '@/lib/workspace-presentation/words';
import { PasskeySection } from '@/components/passkeys/passkey-section';
import { AccountPrivacyLinks } from '@/components/legal/account-privacy-links';
import './manager-profile-upscale.css';
import { readPortalLanguage } from '@/lib/activation/language.server';
import { listWorkforcePermissions } from '@/lib/workforce/authority.server';
import { listLocations } from '@/lib/data/locations';
import { ManagerAuthoritySection, type ManagerAuthority } from '@/components/workforce/manager-authority';
import { readPageLang } from '@/lib/i18n/page-lang.server';
import { MANAGER_PROFILE_COPY } from './manager-profile-copy';

/** Phase 3.5: the Owner and Manager Profile, laid out like the employee Profile (band, details, settings, Sign out).
 * Name, role, company, time zone, My pay and device alerts come from today's reads. Contact, locations and
 * alert choices come from the management profile read in CODEX.md, which the client asks for. */
export async function ManagerProfilePage({ proof }: { proof: SessionMutationProof }) {
  const nativeApp = nativeContext((await headers()).get('user-agent'));
  const lang = await readPageLang(), t = MANAGER_PROFILE_COPY[lang];
  const [workspace, brand, initial] = await Promise.all([
    getWorkspace(),
    currentBrand(),
    readManagementProfile(proof).then(value => {
      const profile = parseManagerProfile(value);
      return profile.state === 'ready' ? profile : null;
    }).catch(() => null),
  ]);
  // My pay is offered exactly when the payroll feature is on and the company keeps pay statements: the rule its own
  // page and the shell's navigation apply (readPayrollCapabilities' "enabled" is that flag). Asking navigationForRole
  // with only that flag avoids a second workspace-locking payroll read on every load (WR-1); the layout already ran one.
  const payroll = payrollFeatureEnabled() ? { enabled: true, canConfigure: false, canReview: false, canApprove: false, internalCalculatorAvailable: false, bankCompatibility: 'UNVERIFIED' } as const : undefined;
  const offersPay = navigationForRole(proof.employee.role, payroll, { modules: brand.modules }).some(item => item.href === '/app/my-pay');
  const owner = proof.employee.role === 'OWNER';
  // Review Nov 11 (MG-013): a Manager's read-only details name who can change them: the workspace's Owners, from the team
  // list a Manager already sees (as the closed Settings notice does). A failed read leaves "An Owner".
  const changedBy = owner ? null : await listEmployees().then(list => ownerNames(list.filter(employee => employee.role === 'OWNER' && employee.active !== false).map(employee => `${employee.firstName} ${employee.lastName}`.trim()))).catch(() => null);
  // SCRUM-215: a Manager's action grants by location, and who to ask for the rest.
  let authority: ManagerAuthority | null = null, locationNames: Record<string, string> = {}, placeNames: Record<string, string> = {}, profileLang: 'en' | 'es' = 'en';
  if (!owner) {
    try { profileLang = (await readPortalLanguage(proof)).language; } catch { /* English */ }
    try {
      const [{ access, permissions }, catalog] = await Promise.all([listWorkforcePermissions(proof), listLocations({ includeInactive: true })]);
      authority = { state: 'ready', pairs: permissions, scopeIds: access.scope.mode === 'LOCATIONS' ? access.scope.locationIds : catalog.filter(location => location.active).map(location => location.id) };
      locationNames = Object.fromEntries(catalog.map(location => [location.id, location.shortName || location.name]));
      placeNames = Object.fromEntries(catalog.map(location => [location.name, location.shortName || location.name]));
    } catch { authority = { state: 'unavailable' }; }
  }
  return <div className="q-page premium-manager-profile c-page--narrow" data-nv-page="">
    <QuietNav back={{ href: "/app/more", label: t.more }} right={owner ? <Link className="q-nav__r" href={`/app/employees/${encodeURIComponent(proof.employee.id)}?edit=1`}>{t.edit}</Link> : undefined} />
    <div className="pmp-content">
      <ManagerProfileLive key={proof.employee.id} initial={initial} identity={{
        employeeId: proof.employee.id,
        name: `${proof.employee.firstName} ${proof.employee.lastName}`.trim(),
        owner,
        company: workspace.name,
        timeZone: timeZoneLabel(workspace.timeZone),
        payHref: offersPay ? '/app/my-pay' : null,
        // Review B5 (NV-061): in the phone app the row opens the app's own alert settings, so it follows the app's
        // registration config (as the shell's device popover does), not the browser's web-push switch.
        deviceAlerts: nativeApp ? !!readNativeRegistrationConfig(process.env) : readNotificationConfig(process.env).featureEnabled,
        payrollAlerts: payrollFeatureEnabled(),
        changedBy,
        locationsWord: wordPreset(brand.words)[lang].locations.toLowerCase(),
        placeNames,
      }} authority={authority ? <ManagerAuthoritySection authority={authority} locationNames={locationNames} owners={changedBy} lang={profileLang} /> : null} accountCards={<>
        {/* Right column, after Notifications and before Sign out (Jose, Oct 20). Each renders nothing while its feature is off. */}
        {/* Codex B-01: the passkeys row is a list item like its neighbours; the item hides while passkeys are off. */}
        <li className="pmp-passkeys"><PasskeySection asRow /></li>
        <AccountPrivacyLinks variant="quiet" />
      </>} />
    </div>
  </div>;
}
