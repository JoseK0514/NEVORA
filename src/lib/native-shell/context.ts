import type {UserRole} from '@/lib/domain';

/** Presentation only. The authenticated server session remains the authority. */
export function nativeContext(userAgent: string | null): boolean {
  return /(?:^|\s)NEVORA-Native\/(?:iOS|Android)\/1(?:\s|$)/.test(userAgent ?? '');
}

export function nativeRoleSupported(role: UserRole): boolean {
  return role === 'EMPLOYEE' || role === 'OWNER';
}
