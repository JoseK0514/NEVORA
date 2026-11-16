# November 16 readiness backend — Claude UI contract

Scope: SCRUM-204–207 only. Backend owner: this Codex checkout. Claude owns UI;
the existing integration owner assembles/accepts development. No other checkout
was edited or contacted. Apply this contract with the backend commits; backend
alone deliberately refuses legacy shift submissions without an original review.

## SCRUM-205: original shift review

- `getShiftForManagement(...).reviewVersion` and the scoped
  `readOperationalShiftEditor(...).data.shift.reviewVersion` are opaque 64-character
  lowercase hex tokens from the same SQL expression. The editor's existing
  `sourceVersion` is a different freshness/authority token; do not substitute it.
- Both edit and delete forms submit hidden `expectedReviewVersion` from the shift
  **originally rendered/reviewed**. Do not fetch a new token at submission time.
  Company edit page: `src/app/app/schedule/edit/page.tsx`; scoped form:
  `src/components/company-access/scoped-manual-shift-form.tsx`.
- Both actions return `{error, issueCode: 'SHIFT_REVIEW_CONFLICT'}` for a missing,
  malformed or stale original review. Keep typed values and the user's draft,
  show the readable error, and offer explicit reload/review. Do not automatically
  retry with a refreshed token. No newer assignment/person/private data is returned.
- Writer contract: `updateShift({...,expectedReviewVersion},executor)`;
  `deleteShift(shiftId,proof,executor,expectedReviewVersion)`.
  The generated-draft path carries the same expectation into its exclusion batch.
- Exact replay after a successful update/delete may return this conflict: the old
  review no longer exists. It creates no duplicate effects. Reload to confirm the
  current assignment; do not label a conflict as a successful replay receipt.
- Publication, Company scope, agreed restrictions, held-edit behavior and
  notification gates retain their existing authority. Publication hard-eligibility
  refusal uses the existing `ManualAssignmentConflictError` and stable rule code.

## SCRUM-206: summary versus full history

`READ` on `/api/period-close` keeps its existing envelope. Each manifest now has:

```ts
events // latest event for each of the three kinds, at most three per manifest
eventCoverage: {
  kind: 'LATEST_PER_KIND'; totalEvents: number;
  returnedEvents: number; complete: boolean;
}
```

Label these rows as a summary, and expose full history when coverage is partial.
Do not label the summary as the complete artifact/handoff history.

The same protected POST endpoint accepts:

```json
{"action":"HISTORY","command":{"startDate":"2026-09-21","endDate":"2026-09-27","limit":50,"cursor":null}}
```

Existing request intent/origin/actor/session headers apply. Result:

```ts
{
  period, events: {id,manifestId,kind,payload,actorId,createdAt}[],
  nextCursor: string | null,
  coverage: {
    kind: 'PAGE'; order: 'createdAt DESC, id DESC';
    totalEvents: number; returnedEvents: number; hasMore: boolean;
    complete: boolean; through: {at:string,id:string} | null;
  }
}
```

`limit` is 1–100 (default 50). Carry `nextCursor` unchanged with the same period.
Use event `id` as the row key. `hasMore:false` ends traversal; `complete:true`
means the whole period fit in the first response. Several-page history is complete
only after the consumer traverses all pages. A new download is outside an existing
upper watermark; refresh from `cursor:null` to include it. Original artifacts,
hashes and event rows remain immutable. No client-selected workspace or person.

## SCRUM-207: safe support correlation

Unexpected handled failures in payroll and the cited timecard/action-center paths
log once per wrapped request through the existing sanitized logger. Their private
JSON error/receipt bodies stay compatible. An unexpected response may add
`X-Nevora-Request-Id` (server-generated UUID), matching the log's `requestId`.
Existing `X-Nevora-Failure` and HTTP status remain distinct. Expected validation,
authorization and conflict refusals do not acquire unexpected-error diagnostics.
No UI change is required for compatibility; a support reference may display this
header without including workforce details. Existing operation IDs still own
mutation recovery; the diagnostic reference is not a replay/receipt key.

## Acceptance handoff

Claude connects the hidden fields, inline conflict/draft recovery and explicit
history controls. The integration owner then qualifies two actual browser sessions
(company and location-scoped Managers), mobile/keyboard behavior and the exact
combined development SHA. Local SQL/action tests are not those browser receipts.
These tasks and independent finding closure remain pending; no production approval
is implied.
