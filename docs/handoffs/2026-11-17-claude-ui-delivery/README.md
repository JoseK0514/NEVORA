# Claude UI delivery, Nov 17, 2026: six feature items, Rondo business evidence, Phase 4

For Jose and for Codex's combined integration. Each item below has its own commit, its report (contract coverage, every
state and how it was produced, keyboard, both languages, every new sentence) and its evidence folder.

## Source and state

- Branch: `claude-codex-collab-nevora`, local. **Not pushed.** The branch on GitHub is at `4e0783ab`; everything after it
  (earlier Rondo UI commits, two Development merges and the commits below) exists only in the local checkout until Jose
  says to push.
- Base: `9c661c3e`, which merges Development `22107a24` into the collaboration branch. CI on `22107a24` at merge time:
  26 jobs passed, 2 failed (`phase-d-attendance-ui` on one of two runs, `phase-d-browser-suite (advisor-lifecycle)`),
  2 still running.
- Scope: presentation, client modules, copy, styles and tests. No server read, handler, authorization rule, route, data
  contract, calculation, migration or feature flag changed.
- Local fictional data only. No deploy, no real email, SMS or push, no paid model or provider call.

## Commits

| Item | Commit | Report and evidence |
|---|---|---|
| Stylesheet scaffolding | `8298566f23cce00157d16413a9409d38f6d828d8` | none (empty sheets, imports, test lists) |
| U02 Scheduling restrictions | `5b4e927afd44f430d56481077c767671790df469` | [U02-scheduling-restrictions](U02-scheduling-restrictions/report.md) |
| U10 Reminders | `2177a2d91f455565a116b5086f73217134bd86af` | [U10-reminders](U10-reminders/report.md) |
| U03 Review routing and U09 Request details | `868e2ed2a180b6b0d398e86143e780837a8dea98` | [U03-U09-review-routing-and-request-details](U03-U09-review-routing-and-request-details/report.md) |
| U11 Access and recovery | `f3988dfb711551cd9eb9c3bde7a8989af3123f1f` | [U11-access-and-recovery](U11-access-and-recovery/report.md) |
| Rondo business evidence | `fab54fe990675b8bb25ac0034b3362078b676844` | [rondo-business-evidence](rondo-business-evidence/report.md) |
| U01 Payroll import (SCRUM-197) | `bb9c465fea1b8cfbd1b3953bfdf746df571f05c9` | [U01-payroll-import](U01-payroll-import/report.md) |
| Phase 4 Employee and Lead | `27e40ff2afe266e8b27bf16b44c2d694a15178b2` | [phase-4](../../product/review-2026-11-14/fixes/phase-4/README.md) |

The commits apply in that order. Each was built and checked on its own by one builder, then all were combined and
checked together. Intermediate commits were not type-checked one by one; the checks below are on the final tree
(`27e40ff2` plus the documentation commit that holds this file).

## Checks on the final tree

| Check | Result |
|---|---|
| `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .` | Clean |
| `npx eslint` on the 157 changed TypeScript files | Clean |
| `npx vitest run --dir src` (1,020 files) | 14,846 pass, 944 skipped, **1 fails**: `src/test/manual-publication.test.ts` |
| Browser, combined build, real sign-in, owned local Postgres | Owner (38 routes), Manager (12), Employee (16) at 1440, 900 and 390; Lead (16) at 1440 and 390. No page errors, no horizontal overflow, no phone target under 44px logged, every band at 196, 224, 296, 363 or 383 |
| Per item | Each builder's own captures at 1440, 900, 390 and 320 with keyboard walks and forced states; see each report |

The Rondo pages return "Page not found" in the combined capture because the shared capture helper does not pass the
adviser flags to the app. They were captured by their own builder with a patched copy of the tool; that evidence is in
the Rondo folder.

## What each item covers, and what it does not

### U02 Scheduling restrictions
- Built: management page at `/app/employees/[employeeId]/restrictions` (agreement in effect as a week, later versions,
  older unconfirmed record with its two choices, requests with Approve and Decline, week editor, admissible Monday,
  review step); Employee and Lead page at `/app/availability/agreement` (view, "Ask to change it", Waiting).
- Real local server: older record, in effect, request, approve, decline, save, conflict, closed-week lock, next-week
  lower bound; Manager, Employee and Lead sign-ins; a hand-made approve from an Employee session answered 403.
- Forced: lost reply (both cases), cross-location refusal, 503, 401.
- Not built: a list of everyone with an older record or a waiting request. No read exists.

### U01 Payroll import and paid-time export
- Built: Import pay (`/app/payroll/import`, five steps) and Paid time export (`/app/payroll-export/paid-time`, four
  steps), entered from Payroll and Time exports. Exact cents, explicit match, a choice for every person not in the
  file, a choice on every break, whole-person batches, per-batch states, completion only on a reconciled manifest.
- Real local server: roster, payroll read, matching, review, confirm, a real refusal (`POPULATION_REVIEW_REQUIRED`),
  the export hold, the Manager's closed card.
- Forced: saved, unknown, conflict, the 30-person reads, export replies and the manifest. **No real saved import, real
  generated export or real manifest was reached with the local fixture.**
- New payroll sentences are listed in the report for Jose and counsel.

### U10 Reminders
- Built: the row control with every state, the check-before-send sheet for one person or several, per-person results,
  on Availability and on a must-read update's "Read by" list. Owner and Manager only.
- Real local server: ready, queued, cooldown after reload, for both kinds. No provider was called.
- Forced: held, blocked, conflict, unknown, lookup results, Updates off, error, loading.
- Not built (the contract has nothing for them): reminders for an unconfirmed schedule, a history, the message text.

### U03 Review routing and U09 Request details
- Built: one Payday count function (2 on every surface for the three-timecard case), typed routing with a guard test,
  "Another reviewer approves this one", "At least N" totals, both shifts on a swap, one distinct result per cover
  request, nullable lateness, scheduled behind recorded on Insights, "What this measures" on every coverage figure.
- Forced in the page from the real response: Payday 2 of 3, "at least", the inbox request states, the sparse day.
- Open: the sidebar and tab badge still show a plain number when Home says "At least" (needs a field from
  `/api/manager/inbox-count`).

### U11 Access and recovery
- Built in English and Spanish: activation steps and every refusal, recovery and reset, assisted recovery hand-over,
  passkey guidance, the last-Owner state card (checked against the real server: no deletion request, session kept).
- **Support reference:** built and mounted, renders nothing. `src/lib/support-reference.ts` is not in Development.
  Switch: in `src/components/access-recovery/support-reference-seam.ts` replace
  `export const readSupportReference: SupportReferenceReader = () => null;` with
  `export { readSupportReference } from "@/lib/support-reference";` and flip one test expectation.
  The reminders client (`src/components/reminders/client.ts`) reads the `X-Nevora-Request-Id` header itself today and
  should move to the same reader then.
- Not run: a real passkey ceremony (the owned test app refuses the options call on its random port). Mobile access
  views (flag off) did not get the new guidance.

### Rondo business evidence
- Built: `/app/ai-manager/business` (records, add or replace by JSON or CSV, review, publish, discard, versions,
  withdraw, delete), Main records (the coverage map editor), Check figures (the query panel), and the evidence card on
  business citations in answers.
- Real local server: empty state, CSV stage, full read, publish, a lost reply recovered by the real check, discard, map
  stage and publish, a figures result, a real "unavailable", flags off, Manager not found.
- Forced: mixed list, findings, conflicts, errors, offline, the chat answer that carries the card.
- No model or provider was called. Model quality and the 50-question acceptance remain with their owner.

### Phase 4 Employee and Lead
- Tracker: Employee 30 fixed, 4 partly; every tablet finding fixed. See the Phase 4 README.

## English and Spanish

- Sign-in, activation, recovery, reset and the public pages are bilingual today: built and photographed in both.
- The signed-in app is English only. Every new signed-in screen keeps its strings in one copy module with `en` and `es`
  entries, and a unit test renders its states in Spanish and fails on a missing key or an English leak. The screens
  render English until a stored language per person is decided. All Spanish is a draft for Jose's review; the reports
  list the terms that need a decision (Owner, Manager, "tú" or "usted").

## Pending checks (not run by Claude)

1. **User manuals.** `src/test/manual-publication.test.ts` fails after any source change until `docs/guides/web` is
   updated for the new screens and rebuilt on the integrated commit.
2. **Browser integration suites** in `src/test/integration` and the **QA scripts** in `scripts/`. Not run. Several
   match on labels and markup these commits changed (attendance and review wording, field messages without a closing
   period, notification titles, the Payroll entry card that replaced the JSON field).
3. **Production build** (`next build`). Not made.
4. **By hand:** a real touch device, Safari and Firefox, a screen reader, Windows High Contrast, 200% text on the
   signed-in screens, a Manager kept to some locations, a real passkey.
5. **Real end-to-end states** listed above as forced.

## For Codex

Each report has its full list. The ones that change behaviour or need an answer:

| Item | Question or dependency |
|---|---|
| U02 | The read returns no time zone (the page uses the workspace zone). A list read for older records and waiting requests. The older record's hours are not in the read. `reason` is required, so a stock reason is sent when the note is empty. Actor names are IDs. Confirm a 503 `unavailable` on a command means nothing was written. |
| U01 | No field for why a person is zero. A corrected or re-matched CSV cannot carry the original file, so reviewed rows are sent. The paid-time page re-reads every 30 seconds rather than holding the 45-second timecards lease. The neutral profile refuses a 10-minute rest as inexact. The next step for one person too big for a file is not named. A joined run with a reviewed people list is needed for a real save. |
| U10 | Eligibility is one locked read per person. Under the activation hold the command answers `unavailable/read_failed`, not `held`. `cooldown` carries only `nextEligibleAt`. No schedule kind, no history read, no message text. |
| U03, U09 | `/api/manager/inbox-count` cannot say its count is a lower bound. A can't-work task carries no coverage outcome. `src/lib/action-center/intelligence.ts` still writes the English review titles; nothing routes on them now. |
| U11 | Deletion is a server action, so a support reference there needs a field in the returned state. Passkey errors have no mount (`src/lib/passkeys/client.ts` consumes the response). Is reset's 503 always before commit? Confirm "up to 3 times in 15 minutes". The activation page now reads the session only to say who is signed in on the device; say if a public page should not. |
| Rondo | Each full read reserves an operation row and each lease renewal spends one; renewals stop after 2 minutes idle. A 409 can arrive after the write committed. No publisher identity on a version. Evidence expires within 15 seconds, so cards read "Checked earlier". An empty map can be published. |
| Phase 4 | Time's read has no scheduled shift, so "still clocked in" shows on Home only. The notifications read lacks an update's title, a statement's period, shift times and the week for availability reminders, and sends two reminders for one schedule week. |
| All | A 503 on a first page load appeared in some captures while several builds ran at once. Not traced. |

## For Jose to decide

None blocks integration. Each report has its full list.

1. **Coverage wording.** Home and Schedule's "Staffing %" is weighted by staff time; only the draft builder's figure is
   "Time fully staffed". Both now have a "What this measures" explanation. Keep two names, or change the figure.
2. **Payroll wording for counsel.** "Paid rest" and "Unpaid meal", with "Choosing 'Unpaid meal' is your statement that
   the person was fully relieved of duty for that break." And the three reasons for a person not in the file.
3. **No "apply to all" for breaks**, by the contract: 1,140 breaks means 1,140 choices.
4. **Restrictions names:** "When they can be scheduled" (management) and "Agreed times" (Employee), shown as times a
   person can work, entered from a pill on Availability.
5. **Reminders:** every row is checked on load (one read per person). The alternative checks on tap.
6. **Activation:** "You're set" replaced "Account activated"; the page names who is signed in on the device.
7. **Employee Home order:** the server's order with the first required task always shown, or required first (Codex).
8. **"Waiting" chip** on every waiting Time off row reverses an earlier decision (NV-280).
9. **Spanish:** all of it is a draft. "Tú" or "usted" in the signed-in app; "Dueño" or "Owner".

## Release sequence

Unchanged. Development is the working and acceptance release. Codex integrates these commits with the backend on
development and verifies the combined build there, including the pending checks above. The exact verified release is
promoted to main only after Jose approves. Nothing here authorizes a main merge, a production activation, copied
production data, a paid activation or a live charge.
