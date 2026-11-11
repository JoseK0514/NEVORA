export type ManagementCloseCommand = {
  operationId: string;
  timeEntryId: string;
  expectedSourceHash: string;
  closedAt: string;
  reason: string;
};

export type ManagementCloseReceipt = {
  status: 'closed';
  operationId: string;
  timeEntryId: string;
  closedAt: string;
  recordedAt: string;
  entryVersion: number;
  clockRevision: number;
  endedBreakId: string | null;
};

export type ManagementCloseResult = ManagementCloseReceipt
  | { status: 'blocked'; reason: 'self_review' | 'stale_source' | 'invalid_interval' | 'overlap' | 'finalized_period' | 'payroll_approved' }
  | { status: 'conflict' | 'unavailable' }
  | { status: 'outcome-unknown'; operationId: string };

export type ManagementCloseContext = {
  state: 'ready';
  observedAt: string;
  target: { timeEntryId: string; employeeName: string; locationName: string; clockInAt: string; openBreakStartedAt: string | null };
  sourceHash: string;
  authority: string;
  validForMs: number;
} | { state: 'closed' }
  | { state: 'unavailable'; reason: 'access_denied' | 'read_failed' | 'schema_missing' };
