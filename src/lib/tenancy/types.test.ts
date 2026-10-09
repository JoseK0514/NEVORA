import { describe, expect, it } from 'vitest';
import type { CalendarReadProof, ClockerProof, PortalProof, ProvisionerScope, TenantProof, WorkerProof } from './types';

// These compile-time regressions reject public construction and scope crossover.
describe('opaque tenant authority types', () => {
  it('requires an issuer-owned brand even when the public kind matches', () => {
    // @ts-expect-error a kind-shaped object has no issuer brand
    const portal: PortalProof = { kind: 'PORTAL' };
    // @ts-expect-error a kind-shaped object has no issuer brand
    const clocker: ClockerProof = { kind: 'CLOCKER' };
    // @ts-expect-error a kind-shaped object has no issuer brand
    const calendar: CalendarReadProof = { kind: 'CALENDAR_READ' };
    // @ts-expect-error a kind-shaped object has no issuer brand
    const worker: WorkerProof = { kind: 'WORKER' };
    expect([portal.kind, clocker.kind, calendar.kind, worker.kind]).toEqual(['PORTAL', 'CLOCKER', 'CALENDAR_READ', 'WORKER']);
  });

  it('keeps provisioning authority outside ordinary tenant authority', () => {
    const scope = { kind: 'PROVISIONER' } as ProvisionerScope;
    // @ts-expect-error control-plane scope cannot enter the tenant executor
    const tenant: TenantProof = scope;
    expect(tenant.kind).toBe('PROVISIONER');
  });
});
