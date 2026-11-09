import {describe, expect, it} from 'vitest';
import type {UserRole} from '@/lib/domain';
import {nativeContext, nativeRoleSupported} from './context';

describe('native presentation context (never authentication)', () => {
  it.each(['iOS', 'Android'])('recognizes the exact v1 %s shell token', platform => {
    expect(nativeContext(`Mozilla/5.0 NEVORA-Native/${platform}/1`)).toBe(true);
  });
  it.each([null, '', 'Mozilla/5.0', 'NEVORA-Native/iOS/10', 'NEVORA-Native/iOS/1evil',
    'pretendNEVORA-Native/iOS/1', 'NEVORA-Native/Other/1', 'NEVORA-Native/iOS/2'])('ignores absent or partial markers: %s', marker => {
    expect(nativeContext(marker)).toBe(false);
  });
  it.each(['EMPLOYEE', 'OWNER'] as UserRole[])('qualifies %s', role => {
    expect(nativeRoleSupported(role)).toBe(true);
  });
  it.each(['MANAGER', 'LEAD', 'OWNER ', 'owner', undefined])('never broadens role %s', role => {
    expect(nativeRoleSupported(role as UserRole)).toBe(false);
  });
});
