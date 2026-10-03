/** Fictional fixture inputs only. Production never imports this module.
 * Browser tests intercept status/mutation routes and browser PushManager;
 * none of these values represents a usable provider subscription or identity. */
import type { DeviceStatus } from '../../lib/notifications/types';
import type { PublicationChange } from '../../lib/assistance/publication-diff';
import type { UserRole } from '../../lib/domain';
export const notificationFixtureRoles: readonly UserRole[] = ['EMPLOYEE', 'LEAD', 'MANAGER', 'OWNER'];
export const notificationFixtureUser = { firstName: 'Avery', lastName: 'Rivera' };
export const notificationFixtureGeneration = 'fictional-generation-account-a-0001';
export const notificationFixtureScope = 'fictional-account-installation-scope-a';
export const notificationFixtureStatus: DeviceStatus = {
  supported: true, enabled: false, configurationAvailable: true, testAllowed: false,
  dismissalScope: notificationFixtureScope,
  // Syntactically base64url, deliberately not a usable P-256 provider key.
  vapidPublicKey: `B${'A'.repeat(86)}`,
};
export const notificationFixtureEnabled: DeviceStatus = {
  ...notificationFixtureStatus, enabled: true, ownershipGeneration: notificationFixtureGeneration, testAllowed: true,
};
export const notificationFixtureChanges: readonly PublicationChange[] = [{
  type: 'TIME_CHANGED', affectedEmployeeIds: ['fictional-employee-a'],
  before: { sourceShiftId: 'fictional-shift', employeeId: 'fictional-employee-a', locationId: '2', date: '2026-10-05', startTime: '08:00', endTime: '12:00', isDesignatedLead: false, isCalloutApproved: false },
  after: { sourceShiftId: 'fictional-shift', employeeId: 'fictional-employee-a', locationId: '2', date: '2026-10-05', startTime: '09:00', endTime: '13:00', isDesignatedLead: false, isCalloutApproved: false },
}];
