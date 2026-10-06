import type { DeviceStatus } from './types';
import { diffPublishedShifts, type PublishedShiftSnapshot } from '../assistance/publication-diff';

export type DeviceCapabilities = { secure: boolean; serviceWorker: boolean; push: boolean; notifications: boolean; requiresStandalone: boolean; installPrompt: boolean };
export type DeviceSetupState = 'loading' | 'unavailable' | 'install' | 'ready' | 'enabled' | 'denied' | 'revoked' | 'pending' | 'error' | 'dismissed';
export type DeviceStatusView = DeviceStatus & { phase?: 'loading' | 'pending' | 'error'; localOwned?: boolean; subscriptionMissing?: boolean };
export function deriveDeviceState(input: { capabilities: DeviceCapabilities; permission: NotificationPermission | 'unsupported'; standalone: boolean | 'unknown'; server: DeviceStatusView; dismissed: boolean }): DeviceSetupState {
  const { capabilities: c, permission, standalone, server, dismissed } = input;
  if (server.phase) return server.phase;
  if (!server.configurationAvailable || !server.supported || !c.secure || !c.serviceWorker) return 'unavailable';
  if (permission === 'denied') return 'denied';
  if (server.enabled && (permission !== 'granted' || server.subscriptionMissing)) return 'revoked';
  if (c.requiresStandalone && standalone !== true) return dismissed ? 'dismissed' : 'install';
  if (!c.push || !c.notifications || permission === 'unsupported') return 'unavailable';
  if (server.enabled) return server.localOwned ? 'enabled' : 'pending';
  return dismissed ? 'dismissed' : 'ready';
}
const dismissalKey = (scope: string) => `fuel-portal-dismissed:${scope}`;
export function readDismissal(storage: Pick<Storage, 'getItem'>, scope?: string): boolean {
  try { return !!scope && storage.getItem(dismissalKey(scope)) === '1'; } catch { return false; }
}
export function saveDismissal(storage: Pick<Storage, 'setItem'>, scope?: string): boolean {
  try { if (!scope) return false; storage.setItem(dismissalKey(scope), '1'); return true; } catch { return false; }
}
/** Filter each side before diffing: reassignment cannot expose a coworker's shift. */
export function ownPublicationChanges(previous: readonly PublishedShiftSnapshot[], next: readonly PublishedShiftSnapshot[], employeeId: string) {
  return diffPublishedShifts(previous.filter(s => s.employeeId === employeeId), next.filter(s => s.employeeId === employeeId));
}
