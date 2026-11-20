export type OwnerActivityChange =
  | { kind: 'SCHEDULE_PUBLISHED' | 'SCHEDULE_EDITED' | 'SCHEDULE_EXCHANGE' | 'SCHEDULE_CALLOUT'; weekStart: string; locationId: string | null; locationName: string | null }
  | { kind: 'MANAGER_SCOPE_ASSIGNED'; employeeId: string; employeeName: string | null; scope: { mode: 'COMPANY' | 'LOCATIONS'; locationIds: string[] } }
  | { kind: 'MANAGER_SCOPE_REVOKED'; employeeId: string; employeeName: string | null }
  | { kind: 'EMPLOYEE_ACTIVATED' | 'EMPLOYEE_DEACTIVATED'; employeeId: string; employeeName: string | null }
  | { kind: 'WAGE_CHANGED'; employeeId: string; employeeName: string | null };

export type OwnerActivityEntry = {
  id: string;
  occurredAt: string;
  actor: { id: string; name: string | null };
  change: OwnerActivityChange;
};

export type OwnerActivityPage =
  | { state: 'ready'; entries: OwnerActivityEntry[]; nextCursor: string | null }
  | { state: 'access_denied' | 'unavailable' };
