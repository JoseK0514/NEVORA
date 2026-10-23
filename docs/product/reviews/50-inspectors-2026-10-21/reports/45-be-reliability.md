# 45 Site Reliability Engineer — failure behaviour, idempotency, conflicts, observability

**Verdict.** The write paths that move money or time are built well. Payroll, clock punches, swaps and callouts, timecards, corrections and schedule copy all carry an operation or command ID, return a receipt, and can recover when the outcome is unknown. Three things are weaker: everyday manager writes (time-off decisions, shift add/edit/delete, Publish), detecting stale edits, and observability. When a manager says "it didn't save", production has almost nothing to look at. `src` contains no logging calls, more than 40 API route files turn every exception into a bare 503, and some screens tell the manager "Nothing changed" when the change may already have been saved.

## Recommendations

1. **Add a minimal server observability layer before release.**
   - *What:* Add `instrumentation.ts` with `onRequestError`, plus a small structured logger: event, route, role, error class/SQLSTATE, request ID. No SQL values, no PII. Call it in every catch that returns 503, in every `.catch(() => null)` read, and in the worker routes.
   - *Why:* `grep console. src` (excluding tests) returns 0 lines, and there is no `instrumentation.ts`. 43 files under `src/app/api` return 503 from a bare `catch{}`, for example `src/app/api/manager/timecards/route.ts:18`, `src/app/api/internal/notifications/dispatch/route.ts:11` and `reminders/route.ts:13`. There are 18 `.catch(() => null)` reads, including Home at `src/app/app/page.tsx:63`. These errors never reach Next's own error log either. The runbook expects logs to exist ("diagnose the original protected logs", `docs/product/specs/codex-joint/DEPLOY-RUNBOOK.md:96`).
   - *Impact:* High · *Effort:* M · *Owner:* Backend

2. **Give every failure a reference a manager can read out to support.**
   - *What:* Put a short request ID in 503/409 bodies and in server-action failures. Show it as "Reference: 7F3K2Q" in the failure notices and on both error screens, and log it with recommendation 1.
   - *Why:* Both error boundaries receive `error.digest` and ignore it (`src/app/app/error.tsx:8`, `src/app/error.tsx:5`). `ActionForm` notices carry no reference (`src/components/wave-a/action-form.tsx:30-36`). Today a support ticket cannot be matched to a server event.
   - *Impact:* High · *Effort:* S · *Owner:* UI + Backend

3. **Make manager time-off decisions retry-safe, and stop saying "Nothing changed".**
   - *What:* Add an `operationId` and a "same decision already applied" replay to the decision path, as the withdraw path already does (`src/lib/data/requests.ts:219-250`).
   - If another manager decided differently, say who decided and when.
   - Reword the network-failure notice to "We couldn't confirm this. Check the request before deciding again."
   - *Why:* `reviewTimeOffRequest` returns `false` once a request is no longer pending (`requests.ts:199`). The action then redirects to `error=review` (`src/app/app/requests/actions.ts:83`), which shows "That decision wasn't saved" (`src/components/manager-time-off.tsx:140`). Example: a manager taps Approve on bad Wi-Fi, the server commits, and the response is lost. The card says "Check your connection and try again. **Nothing changed.**" (`manager-time-off.tsx:151`). The retry then says "wasn't saved" again, although the approval is live and the employee has been notified.
   - *Impact:* High · *Effort:* M · *Owner:* Backend (replay) + UI (copy)

4. **Send an expected-version token with Publish and shift edits.**
   - *What:* Send the latest revision ID or shift `updated_at` with Publish and with shift edits. If the week changed, return a conflict: "This week changed since you opened it. Review the changes before publishing."
   - *Why (Publish):* The form sends only `weekStart`, `locationId` and `confirmWarnings=yes` (`src/components/schedule-publication-controls.tsx:32-35`). "Publish anyway" skips the readiness recheck (`src/app/app/schedule/actions.ts:155`). It therefore publishes whatever is current, including another manager's edits and warnings this manager never saw.
   - *Why (shift edit):* The edit form posts only `shiftId` (`src/app/app/schedule/edit/page.tsx:74`), so the last write wins. The strong snapshot guard in `commitPublishedWeekChange` reads state at submit time, not when the form was opened (`src/lib/data/notification-transactions.ts:224-248`).
   - *Impact:* High · *Effort:* M · *Owner:* Backend

5. **Make shift create and delete safe to retry.**
   - *What:* Add a client `operationId`, a pattern that already exists for Copy week (`schedule/actions.ts:316`). Treat "already deleted by this operation" as success.
   - *Why:* If the create response is lost and the manager retries, the second create fails as `SHIFT_OVERLAP`, "Employee already has an overlapping shift." (`src/lib/scheduling/validate-shift.ts:128`). A delete retry hits `error=INVALID_SHIFT` (`schedule/actions.ts:297-299`). Both tell the manager the save failed when it worked. Creating an employee has the same shape: a retry fails as "Check unique ID/email" (`src/app/app/employees/actions.ts:210`).
   - *Impact:* Medium · *Effort:* M · *Owner:* Backend

6. **Codify the background job schedule and monitor it.**
   - *What:* Register the dispatch and reminder endpoints and the payroll worker as crons in `vercel.json` or another versioned scheduler. Persist each run's report. Alert when the oldest due notification is more than about 10 minutes old, when `failed` is above 0, or when no run has happened in 15 minutes.
   - *Why:* `vercel.json` defines no crons. The runbook says the repository "do[es] not establish … cron registration" (`DEPLOY-RUNBOOK.md:9`). There is no health or heartbeat endpoint. The worker already counts claimed, accepted, retried, failed and expired deliveries (`src/lib/notifications/worker.ts:23,95`), but only returns them in the HTTP body. If the trigger stops, schedule notifications stop and nothing notices.
   - *Impact:* High · *Effort:* M · *Owner:* Backend (+ Product to approve the alert channel)

7. **Let Home and Schedule degrade one card at a time instead of blanking the page.**
   - *What:* Use `Promise.allSettled` for the Home reads. Render a card that says "unavailable" for the read that failed, and keep the rest.
   - *Why (Home):* Home fires 16 reads in parallel (`src/lib/data/manager-dashboard.ts:47-64`). One failure makes the whole Home a "This page could not be loaded" page (`src/app/app/page.tsx:63-74`). The reads are also not one snapshot, so counts can come from different moments.
   - *Why (Schedule):* A failed hour-targets read silently hides everyone's hours (`src/app/app/schedule/page.tsx:244,248`). That looks like "no targets set" rather than "couldn't load".
   - *Impact:* Medium · *Effort:* M · *Owner:* Backend + UI

8. **Add timeouts and one transient retry to reads.**
   - *What:* Give each DB query a default timeout of about 8 seconds and retry idempotent GETs once on fetch errors such as Neon cold starts. Put a timeout on `payrollRequest`.
   - *Why:* The Neon executor only aborts when a caller passes a signal (`notification-transactions.ts:33-43`). Page reads pass none, so a slow cold start hangs until the platform's own function timeout. `payrollRequest` has no timeout (`src/components/payroll/api.ts:44`). Kiosk punches already use `AbortSignal.timeout(12000)` (`src/lib/clocker/punch-client.ts:136`).
   - *Impact:* Medium · *Effort:* S · *Owner:* Backend

9. **Detect conflicts by SQLSTATE or constraint name, not by error-message text.**
   - *What:* Raise a custom SQLSTATE for version conflicts and map it explicitly.
   - *Why:* Conflicts are currently found by regex on the error message: `/schedule_week_version_conflict/.test(error.message)` (`notification-transactions.ts:255`), and `/CONFLICT|immutable|duplicate key/` (`src/lib/payroll/http.ts:87-88`). A driver or Postgres message change would quietly turn a 409 into a 503, so "reload and review" becomes "unavailable".
   - *Impact:* Low · *Effort:* S · *Owner:* Backend

10. **Make a repeat Publish a no-op.**
    - *What:* When the schedule is already published and the shifts are unchanged, skip the new revision and return "Already published".
    - *Why:* `publishScheduleWithRevision` always sets `publishWeekStarts` (`src/lib/data/publication-revisions.ts:156-158`). Because of that, the "unchanged" skip at `notification-transactions.ts:356-358` never applies, and a double tap or retry writes another revision with identical shifts. Per-person notifications are diff-based, so nobody is re-notified, but the revision history fills with noise.
    - *Impact:* Low · *Effort:* S · *Owner:* Backend

## What's good
- The high-stakes commands are idempotent from end to end.
  - Payroll keeps a recovery reference in browser storage and looks up the receipt before any retry (`src/components/payroll/use-payroll.ts:88-142`).
  - Punches carry a `commandId` and the expected revision (`punch-client.ts:46,66-70`).
  - Swaps and callouts surface `outcome-unknown` and reconcile it by operation (`src/app/app/exchange/actions.ts:26-34`).
  - Creating a time-off request uses `ON CONFLICT DO NOTHING`.
- Schedule writes use a compare-and-swap on the whole week snapshot inside one transaction, with bounded retries on serialization failures and deadlocks (`notification-transactions.ts:222-262`). The notification worker uses leases, a retry policy, expiry and cancellation (`worker.ts`).
- There is no optimistic UI (no `useOptimistic` anywhere), and a single-submit guard blocks double taps (`src/components/wave-a/single-submit.ts`). Screens show what the server has.

## Not checked / limits
- No browser use (per brief), and no integration tests run. Findings come from reading the code.
- I could not see the hosting platform's own log capture. Vercel records uncaught errors with a digest, but the swallowed ones above never get there.
- I did not trace the payroll worker's scheduler, or audit every Settings form for lost updates. Policy writes return a `PolicyWriteResult`, and I did not verify the revision behind it.
- Employee and Lead write paths got only a light look, apart from punches and time-off requests.
