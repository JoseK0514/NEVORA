# Claude to Codex and Fable: UI closeout on the backend contracts (Nov 15, 2026)

This closes the current UI work against Codex's completed backend. It is not Phase 4 and not a redesign. Fable continues
Phase 4 from the commit named below. Codex owns the combined development integration, the QA script updates and the
final manuals rebuild.

## Source and state

- Branch: `claude-codex-collab-nevora` on `origin`. Only this branch is pushed; development and main are untouched.
- Inputs: reviewed collaboration UI `5c79f685`; backend development `b5085edb33d1bccc440588f950e728566c8a79ac`.
- Commits, in order, on top of `5c79f685`:
  1. `4fc8e626` Phase 3 decisions: Jose's thirteen answers (presentation only).
  2. `4c503de4` Merge `origin/development` (`b5085edb`) into the collaboration branch. Conflict resolutions are listed
     in the commit message (navigation, More, Clocker page and panel, central billing client and tests, login kept-ID,
     phase-c QA script, owned-next-app options).
  3. The closeout commit (this document; its SHA is in the push report): the seven connections, timecard focus.
- Test base: a detached scratch worktree of the closeout tree (`HEAD` of the branch plus nothing else), served by the
  owned-app harness on a fresh local PostgreSQL with fictional data. No real email, charge, SMS or hosted change.

## Release sequence (unchanged)

Development is the working and acceptance release. Codex integrates this branch with development and verifies the
combined build there. The exact verified release goes to main only after Jose approves. Nothing here authorizes a main
merge, a production activation, copied production data, a paid activation or a live charge.

## The seven connections

| # | Connection | Status | Where |
|---|---|---|---|
| 1 | Things to do: correction details | **Implemented.** The row says the work day, the requested time, what was recorded and the length difference ("Wed, Nov 11 · 8:30 AM – 5:00 PM, was 9:00 AM – 5:00 PM · +30 min"), in the workplace zone. Nothing recorded reads "Add …"; an open entry reads "was 9:00 AM with no clock-out" with no difference. Missing or unreadable facts keep the earlier line. Cover requests say "Cover request" and swaps "Shift swap" (`exchangeKind`). | `src/lib/action-center/present.ts` (`correctionLine`, request kinds), `src/components/manager-inbox-corp.tsx` (`requestDetail`) |
| 2 | Notifications: eventType, outcome, names, count, zone | **Implemented.** Kind (icon, destination, fixed titles) follows `eventType`, so the new event labels keep their icon; old labels still work. Employee titles say what happened ("Your time-off request for Nov 26 was declined", "Ana Colon asked you to swap a shift"); a decision whose request moved on adds "Now cancelled"; schedule notices add the reader's shift count; the manager summary says "5 waiting". Rows naming different people never fold. Owner/Manager times, days and labels use the snapshot's workplace zone; the Employee desktop list now passes it too (the phone list already had it). Mark-read, expiry and privacy are unchanged; nothing is shown that the item doesn't carry. | `src/lib/notification-facts.ts`, `src/lib/notification-inbox-view.ts`, `src/components/notification-inbox.tsx`, `src/components/employee-mobile/notifications-list.tsx`, `src/components/employee-b/messages-b.tsx`, `src/components/employee-mobile/messages-view.tsx` |
| 3 | Owner Home: tablet and setup | **Implemented.** `clockerRegistered === false` replaces the two attendance tiles with one "Time clock · Not set up" tile (linked to `/app/settings/clocker` for an Owner). True or absent keeps the tiles; a registered tablet is not read as punching on. `setupProgress` adds team, published schedule, registered time clock, clock-in PINs and (with payroll) pay schedule to "Finish setting up" ("3 of 7 done · Next: publish a schedule"). Without the facts the row is the two configuration checks, never more setup shown as done. | `src/components/owner-b/home-b.tsx`, `src/components/owner-setup-card.tsx` (`setupItems`, `HomeSetupProgress`), `src/components/manager-dashboard.tsx` |
| 4 | Payroll: currentPeriod, correctionDelta, external mode | **Implemented.** Payroll's period, payday and "today" come from `currentPeriod` once read (null: no pay schedule; absent: the route's period as before). Up next (desktop) and the steps card (phone) link to that period's Timecards with "Approve this period's timecards" or "Can be approved from Mon, Nov 16". A correction review shows "Net pay on statements: −$2.50 across 2 people" and each changed person "was $812.00 · now $824.50 · +$12.50", above the existing settle note; it never says paid or remitted. Malformed facts are dropped, not shown. External mode (`internalCalculatorAvailable=false`, provider import, `WAITING_FOR_AMOUNTS`) was already respected and is unchanged; historical statements unchanged. | `src/components/payroll/payroll-runs.tsx` (`CorrectionDelta`, period), `src/components/payroll/api.ts` (`withReadFacts`), `src/components/payroll/money.ts` (`formatSignedPayrollMoney`), `src/app/app/owner-b-time-pay.css` |
| 5 | Invitations: deliveryAvailable, allowedCommands | **Implemented** (parser already read both). The reason shows before anyone tries when invitation email isn't configured; a Manager's read-only status says "An Owner sends invitations." with no Send or Cancel; the issue receipt is "Invitation issued" (was "Invitation sent"), with the existing delivery wording that never claims receipt. | `src/components/company-access/employee-invitation-panel.tsx` |
| 6 | Owner trial/payment notices | **Implemented.** Owner Home and Owner Notifications show the status read's `notice`: trial ending (date in the workplace zone, days left), failed renewal (until when access continues) and paused access (the reason's own words), each linking to `/app/billing`. Billing off (404), another role or a failed read shows nothing and stops asking. The read's 15-second lifetime applies (it renews while the page is visible). Nothing infers payment from a return URL. | `src/components/owner-b/billing-notice-card.tsx`, `src/components/owner-b/home-b.tsx`, `src/components/premium-home.tsx`, `src/components/owner-home-corp.tsx`, `src/app/app/notifications/page.tsx` |
| 7 | Billing client: operationState 'refused' | **Implemented** (in the merge). A final refusal retires the held intent (`retired: true`) and keeps its named refusal; 409, other 4xx, 5xx and uncertain outcomes keep the original key and body; no automatic financial retry. The central page reads the held state again after awaiting the answer. | `src/lib/commerce/central-billing.ts`, `src/components/commerce-recovery/central.tsx` |

Also in this commit: after approving or finalizing a timecard, keyboard focus moves to "Next timecard" when there is
one, otherwise to the confirmation block (it was lost to the top of the page). `src/components/timecards.tsx`.

## Defects found on development's contracts (fixed here, for Codex's review)

1. **Things to do failed to load on development.** `b5085edb` adds `exchangeKind` to exchange request facts, but the
   client's request-fact validator (`validateRequestFacts` in `src/lib/action-center/project.ts`) allowed a fixed key
   list without it, so any shift request made the whole action-center read fail ("Things to do didn't load"; Home's
   Things to do card too). Fixed by allowing `exchangeKind` with exactly `SWAP` or `COVERAGE`. Regression test:
   `src/lib/data/action-request-facts.server.test.ts` runs the server's projection through the client parser (it fails
   without the fix). Please check development's other new optional fields against their client validators the same way.
2. **Manager coverage summaries.** A summary can arrive as `COVERAGE_ATTENTION`; it is a summary, not a shift request.
   Mapped explicitly (`src/lib/notification-facts.ts`, `src/lib/notification-inbox-view.ts`) with tests.
3. **Login kept Employee ID** (in the merge): the ID stays on the replacement-issuance failure and is cleared on the
   transfer to `/reset-access`, as the Nov 15 handoff asks. Tests fail without the change.

## Backend requests still open (reconciled against `b5085edb`)

| Request | State in source |
|---|---|
| Swap's second shift (date, time) and whether a can't-work report has cover | Still absent. `exchangeKind` (swap or cover) arrived and is used. |
| Explicit self-review flag and approver identity; what a Manager's access covers | Still absent (`needs-you.ts` infers "own" from the title; Owners' names come from `listEmployees`). |
| Approval deadline for timecards; minutes late on a Today shift | Still absent (`late` is a boolean). |
| Reminder authority, eligibility and the Remind action wiring | Still absent; `POST /api/manager/reminders` is not called by the UI. |
| `overdue` beside `count` on the inbox count; planned and scheduled hours per day/person | Still absent. |
| A way to ask the Owner from a closed page | Still absent. |
| Typed `createdAt` on pending time-off rows | Still absent (read through a cast in `manager-time-off.tsx`). |
| New: should no-punch items leave the Things to do count while no time clock is registered? | Decision for Jose and Codex. Home's tiles change; the count (shared with the badge's server read) does not. |

## Checks (run on the closeout tree)

| Check | Result |
|---|---|
| `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .` | Clean |
| `npx eslint` on every changed TypeScript file | Clean |
| `npx vitest run --dir src` | 13,595 passed, 944 skipped, 6 failed: `manual-publication` (pending manuals rebuild, owed to Codex) and 5 in `phase-e-browser-evidence`, `phase-e-root-group-process`, `phase-e-runner`, which pass in isolation (163/163) and did not fail on the run before; load-sensitive under the full suite, untouched by this work |
| Merge commit alone (`4c503de4`), full suite | 13,570 passed, 1 failed (`manual-publication`) |
| Browser, owned app on fictional local PostgreSQL (Owner, Manager, Employee; 320, 390, 900, 1440) | Things to do correction lines and request kinds; Owner Home setup row ("5 of 7 done") and tiles; Payroll Up next with the Timecards link and a real correction's difference (+$39.53, Ana Colon); notifications (Owner summaries, Employee event titles and shift counts); keyboard approval puts focus on "Next timecard" with a visible ring; no horizontal overflow on the pages checked |
| Not seen in a browser | The "Time clock · Not set up" tile (the fixture has a registered tablet; unit-tested); the invitation panel (every fixture person is activated; unit-tested); the billing notice (commerce is off locally, so the read is 404 and nothing shows; unit-tested); the central billing page's post-await pending read (needs the central billing API) |

## Owed to Codex's combined integration

1. **User manuals**: `src/test/manual-publication.test.ts` fails on any source change and stays failing until the
   manuals are rebuilt on the integrated commit (new labels: "Pay period still open", "Next timecard", "Time clock · Not
   set up", setup steps, notification titles, "Invitation issued", shift lead helper, offline pill, Employee sidebar
   without Notifications).
2. **Browser integration suites** in `src/test/integration` and the GitHub Mobile Access workflow (three tests failed
   before this work; see the Phase 3 handoff).
3. **QA scripts** in `scripts/`: labels above, plus the earlier lists in the Nov 14 and Phase 3 handoffs.
4. **Production build** (`next build`) on the integrated commit.
5. **By hand**: real touch device, Safari, screen reader, Windows High Contrast; the central billing page's refusal
   path against the sandbox billing API (no page-level test covers the post-await pending read).
