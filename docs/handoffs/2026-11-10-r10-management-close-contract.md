# R10 management close: backend and Claude integration contract

Status: locally qualified in the [R08–R10 packet](2026-11-10-r08-r10-local-qualification.md), based on detached development0317598; no push, GitHub Actions, hosted migration or deployment authorized for this packet. Native applications are excluded. This contract does not certify the held combined UI source.

Jose selected **Owner and Manager, within their existing permissions**. Current cookie, active actor, active company and current operational grant remain mandatory. Both the recorded entry location and worker's current primary location must be in scope. An inactive grant location still invalidates a location grant under existing Company Access rules; Company-scoped management can recover an inactive target location. The target employee/tablet may be inactive; this command does not reactivate either. A person cannot close their own punch through this management path.

## Browser boundary

`GET /api/manager/timecards/{encoded entry ID}/close`

Send `x-nevora-management-close: 1`, cookie credentials and no query string. A ready response contains only `state`, `target:{timeEntryId,employeeName,locationName,clockInAt,openBreakStartedAt}`, `sourceHash`, `authority`, `observedAt`, `validForMs`, `recoveryScope`. Closed entries return `{state:'closed',authority,observedAt,validForMs,recoveryScope}` after the same current authorization checks. `recoveryScope` is a domain-separated, nonsecret company namespace, also supplied by the server page; the client rejects a mismatched namespace. Private responses use `Cache-Control: no-store, private` and `Vary: Cookie`. Source hashes are optimistic concurrency inputs; authority is a public domain-separated intent binding, never authentication.

`POST` to the same path, with JSON, same-origin browser metadata and:

```json
{
  "operationId": "a13d6b36-2740-4e2e-8bca-cd11af44619f",
  "timeEntryId": "recorded-entry-id",
  "expectedSourceHash": "32 lowercase hex characters from the ready context",
  "closedAt": "2026-11-10T16:15:00Z",
  "reason": "Confirmed last worked time while the employee is unavailable."
}
```

Headers: `x-nevora-management-close: 1`, `x-nevora-management-close-authority: <ready authority>`, `Content-Type: application/json`. Do not send actor, workspace, employee, location or active-state claims in the body. The path and body entry ID must agree. Unknown fields and actual request bodies over8192 bytes are rejected. Reason must be trimmed,1–500 characters and free of control/format characters. The explicit offset instant retains microsecond precision; offset-free local times are rejected.

- 200 `{state:'closed',receipt:{status:'closed',operationId,timeEntryId,closedAt,recordedAt,entryVersion,clockRevision,endedBreakId}}`.
- 409 `{state:'blocked',reason}` where reason is `self_review`, `stale_source`, `invalid_interval`, `overlap`, `finalized_period` or `payroll_approved`; or `{state:'conflict'}` for operation reuse/retry exhaustion.
- 503 `{state:'outcome_unknown',operationId}` means the write may have committed. Reconcile with the **same operation, source, end time and reason**. A retry returns the original durable receipt after current scope checks. Never create another operation to recover an uncertain one.
- 401/403 means authentication/transport access was denied;503 `{state:'unavailable'}` means no confirmed public result. All infrastructure diagnostics stay server-side.

## Required management interaction

The current development-based Timecards inspector now offers the action on another person's open recorded entry, using its actual ID. It shows the named worker, location, recorded start and any open break, with a blank company-local end time, required reason and explicit verification checkbox. It rejects nonexistent and ambiguous DST input. An existing open break ends at the same selected instant. This bounded implementation does not import or certify the separate held Claude UI source.

Use the ready context's observation budget; clear names, source and authority on expiry, blur/background, offline, account/session change, loss of scope or failed refresh. Abort stale reads and ignore late responses. The service separately checks live session/scope and source at mutation time. A memory-only journal preserves an uncertain command across privacy retirement and inspector/protected-tree unmounts in the same document, bound to origin, company namespace and actor. Different actors cannot read that journal. A newly authenticated session for the original actor must obtain fresh context/authority; the original operation, source, end time and reason remain identical. The journal is not persisted in browser storage and does not survive a full document reload or browser crash. Disable duplicate submission while waiting. For an unknown outcome offer **Retry same close**. For a stale source, load and review a new context before a genuinely new action. Clear successful drafts and refresh timecards/Action Center from current data. Both Owner and Manager shells recheck their server identity after resuming; identity changes revalidate the retained server layout.

The dedicated owned browser suite `vitest.management-close-ui-browser.config.mts` exercises the actual inspector in Chromium and WebKit, Owner desktop and Manager phone contexts, keyboard/labels, 320/390/1440 widths and 200% text. It includes real password cookies and SQL, a committed response lost before acknowledgment, blur/remount, inspector reopening, atomic authenticated account replacement, company-context rejection, exact-operation replay/one audit, an open break and a later new punch. This is local acceptance for the selected source, not hosted or held combined-source certification.

## Recorded-time and deployment boundaries

Migration0057 adds `management_time_closes` with immutable before/after evidence and receipt; existing tablet ledger events are never impersonated. The command increments the normal clock revision, fences stale entry/break state, closes a current break at the chosen time and rejects future/invalid/overlapping intervals. Existing raw timecard finalization interlocks remain active.

Approved payroll stays blocked until an explicit payroll correction is open, matching the existing P4 reopen workflow in `clocker-timecards.integration.ts`. A REVIEW_REQUIRED correction permits repairing source time before rebuilding/reapproving payroll; the approved parent's history remains immutable. This command neither initiates a correction nor approves/recalculates payroll or sends payment. Receipt replay remains available after later approval if current actor/scope still permit it.

New functions are SECURITY INVOKER, revoked from PUBLIC and granted to company APP roles only; WORKER receives no new capability. Fresh bootstrap and the canonical manifest include the same migration and grants. Any hosted adoption needs its own selected-environment migration/rollback evidence and authorization. Combined source integration, authenticated UI acceptance and hosted release approval remain separate gates. **Jose's Actions/push hold remains in effect.**

Local evidence: `/Users/josek0514/.codex/r08-r10-local-20261110` (baseline/validation RED, service SQL RED, privacy/recovery/actual SQL logs and independent replay regression). Final qualification and exact commits will be recorded in the combined handoff after R08/R09 integration.
