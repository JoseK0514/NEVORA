/** Public, serializable contract. Session proofs and hashes never cross this boundary. */
export type TaskChecklistItem = {id: string; label: string};
export type TaskSchedule = {frequency: 'ONCE' | 'DAILY' | 'WEEKLY'; startDate: string; endDate: string | null; weekdays: number[]; dueTime: string};
export type TaskDraft = {title: string; description: string; locationId: string; assigneeId: string; checklist: TaskChecklistItem[]; schedule: TaskSchedule; reminderMinutesBefore: number | null};
type Identity = {operationId: string; authority: string};
type TaskIdentity = {taskId: string; expectedRevision: number};
export type StaffTaskCommand = Identity & (
  | {kind: 'CREATE_TEMPLATE'; templateId: string; draft: TaskDraft}
  | {kind: 'REVISE_TEMPLATE'; templateId: string; expectedRevision: number; draft: TaskDraft}
  | {kind: 'ARCHIVE_TEMPLATE' | 'SYNC_TEMPLATE'; templateId: string; expectedRevision: number}
  | (TaskIdentity & {kind: 'CHECK_ITEM'; itemId: string; checked: boolean})
  | (TaskIdentity & {kind: 'COMPLETE' | 'REOPEN' | 'CANCEL' | 'ACK_REMINDER'})
  | (TaskIdentity & {kind: 'REASSIGN'; assigneeId: string})
  | (TaskIdentity & {kind: 'COMMENT'; body: string})
);
export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TaskTemplate = {id: string; revision: number; draft: TaskDraft; archived: boolean; nextDate: string | null};
export type StaffTask = {id: string; templateId: string; businessDate: string; locationId: string; assigneeId: string; title: string; description: string; checklist: TaskChecklistItem[]; checkedItemIds: string[]; dueAt: string; revision: number; status: TaskStatus; completedBy: string | null; completedAt: string | null; assigneeActive: boolean; reminder: null | {id: string; dueAt: string; unread: boolean};};
export type TaskEvent = {id: string; kind: string; actorId: string; createdAt: string; data: Record<string, unknown>};
export type TaskCursor = {businessDate: string; id: string};
export type TaskHistoryCursor = {createdAt: string; id: string};
export type TaskQuery = {fromDate: string; toDate: string; view: 'MINE' | 'TEAM'; locationId: string | null; taskCursor?: TaskCursor | null; templateCursor?: string | null};
export type TaskContextQuery = {employeeCursor: string | null; locationCursor: string | null};
export type TaskHistoryQuery = {taskId: string; beforeCursor: TaskHistoryCursor | null};
export type TaskCommandResult =
  | {status: 'committed'; operationId: string; templateId: string; taskId?: string; revision: number; createdCount?: number; nextDate?: string | null; more?: boolean}
  | {status: 'invalid' | 'blocked' | 'conflict' | 'unavailable'; reason: string}
  | {status: 'outcome_unknown'; operationId: string};
export type TaskListResult = {state: 'ready'; tasks: StaffTask[]; templates: TaskTemplate[]; hasMore: boolean; nextTaskCursor: TaskCursor | null; nextTemplateCursor: string | null; authority: string; observedAt: string; timeZone: string; validForMs: number} | {state: 'blocked' | 'invalid' | 'unavailable'; reason: string};
export type TaskDetailResult = {state: 'ready'; task: StaffTask; events: TaskEvent[]; historyTruncated: boolean; nextHistoryCursor: TaskHistoryCursor | null; authority: string; observedAt: string; validForMs: number} | {state: 'blocked' | 'unavailable'; reason: string};
export type TaskContextResult = {state: 'ready'; management: boolean; authority: string; timeZone: string; locations: {id: string; name: string}[]; employees: {id: string; firstName: string; lastName: string; primaryLocationId: string; eligibleLocationIds: string[]}[]; hasMore: boolean; nextEmployeeCursor: string | null; nextLocationCursor: string | null; observedAt: string; validForMs: number} | {state: 'blocked' | 'unavailable'; reason: string};
export type TaskOccurrence = {businessDate: string; dueAt: string; reminderAt: string | null};
export type TaskOccurrencePlan = {occurrences: TaskOccurrence[]; nextDate: string | null; more: boolean};
