import Link from 'next/link';
import { QuietNav } from '@/components/quiet/quiet';
import { getWorkspace } from '@/lib/data/workspaces';
import { navigationForRole } from '@/lib/navigation';
import { readNotificationConfig } from '@/lib/notifications/config';
import { readNativeRegistrationConfig } from '@/lib/native-push/config';
import { nativeContext } from '@/lib/native-shell/context';
import { headers } from 'next/headers';
import { payrollFeatureEnabled } from '@/lib/payroll/service';
import type { SessionMutationProof } from '@/lib/shift-changes/types';
import { timeZoneLabel } from '@/lib/time-zone-label';
import { currentBrand } from '@/lib/workspace-presentation/current.server';
import { readManagementProfile } from '@/lib/data/management-profile.server';
import { parseManagerProfile } from './contract';
import { ManagerProfileLive } from './manager-profile-live';
import { PasskeySection } from '@/components/passkeys/passkey-section';
import { AccountPrivacyLinks } from '@/components/legal/account-privacy-links';
import './manager-profile-upscale.css';

/** Phase 3.5: the Owner and Manager Profile, laid out like the employee Profile (band, details, settings, Sign out).
 * Name, role, company, time zone, My pay and device alerts come from today's reads. Contact, locations and
 * alert choices come from the management profile read in CODEX.md, which the client asks for. */
export async function ManagerProfilePage({ proof }: { proof: SessionMutationProof }) {
  const nativeApp = nativeContext((await headers()).get('user-agent'));
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
  return <div className="q-page premium-manager-profile c-page--narrow" data-nv-page="">
    <QuietNav back={{ href: "/app/more", label: "More" }} right={owner ? <Link className="q-nav__r" href={`/app/employees/${encodeURIComponent(proof.employee.id)}?edit=1`}>Edit</Link> : undefined} />
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
      }} accountCards={<>
        {/* Right column, after Notifications and before Sign out (Jose, Oct 20). Each renders nothing while its feature is off. */}
        {/* Codex B-01: the passkeys row is a list item like its neighbours; the item hides while passkeys are off. */}
        <li className="pmp-passkeys"><PasskeySection asRow /></li>
        <AccountPrivacyLinks variant="quiet" />
      </>} />
    </div>
  </div>;
}
