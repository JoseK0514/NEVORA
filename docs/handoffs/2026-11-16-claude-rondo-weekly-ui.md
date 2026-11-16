# Rondo weekly plan: Claude's UI for Codex's weekly API

Date: November 16, 2026. Author: Claude (UI). Receiver: Codex (backend, model tools, hosting, combined real-API QA).

## Release sequence and where this sits

Jose's policy (Nov 12, 2026): Development is the primary acceptance release, held to production standards; main and
production only after Jose approves the exact verified release. This is a **local, unpushed UI commit** on
`claude-codex-collab-nevora`, on top of the already-pushed company-knowledge UI `4e0783ab` (preserved, unchanged except
that the AI manager band now carries two links). Codex assembles it with the backend in an isolated acceptance candidate
and runs the real-API QA. Nothing here deploys, pushes, merges, enables a flag, calls a model, sends a notification or
touches real data.

## Route (for model citations)

`/app/ai-manager/weekly` and `/app/ai-manager/weekly?review=<UUIDv4>`, in `src/app/app/ai-manager/weekly/page.tsx`. The
commit that adds it is the one this handoff ships in (reported with the hand-back). Opening a `?review=` link only
observes: weekly on, it sends `read_week_plan` (a new request ID); weekly off, it sends `check_week_plan`. A link never
compares, approves, declines or publishes. An entry point "Weekly plan" sits in the AI manager band beside "Company
knowledge".

## Source evidence

| Item | Value |
|---|---|
| UI branch, base | `claude-codex-collab-nevora`, base `4e0783ab` (company-knowledge UI, pushed) |
| Backend API read (read only) | Codex worktree `nevora-rondo-anthropic-20261115`, commit `4d3603607615b20a306365fbd63820a756ec3b4c`: the UI contract, `weekly-contracts.ts`, `weekly-http.server.ts`, `weekly-service.server.ts`, `weekly-http.integration.ts` |
| DTO file | `src/lib/owner-advisor/weekly-contracts.ts` copied byte-for-byte from `4d360360` (its two imports, `coverage-actions.ts` and `coverage-plan-contracts.ts`, are identical on both sides). Codex's uncommitted tree adds `WeeklyModelComparison`/`WeeklyInspectionReference`; the UI uses neither, so assembly can take Codex's newer file |
| Backend files changed by me | None. No schema, registry, migration order or service file was edited; nothing was cherry-picked |

## What was built

- **Page and gate.** Company-wide Owner and `NEVORA_OWNER_ADVISOR_ENABLED` (parent off: 404, no recovery). The weekly
  switch is read as `process.env.NEVORA_OWNER_ADVISOR_WEEKLY_ENABLED === 'true'` (the registry lacks the property on
  this base); at assembly replace it with `readFeatureFlags(process.env).ownerAdvisorWeekly`. Bootstrap reads only the
  workspace time zone and active locations through `withOperationalCompany` (`getWorkspace`, `listLocations`).
- **Plan a week.** Week stepper (Monday weeks, one week back to eight ahead; a UI choice), "Fill open gaps" or "Rebuild
  generated drafts" (explained before it is chosen: may replace earlier generated drafts; manual, published and
  history-protected work is kept), All locations or chosen ones (max 20, sorted, at least one). One new request ID per
  deliberate comparison.
- **Options.** The schedule now (baseline), up to two option cards side by side from 1024px: status, adds, replaces,
  keeps, coverage with change, still open, inspection reasons ("Can't be saved: …" when not apply-eligible, "Worth a
  look: …" otherwise), the first three issues with their provenance and "N more in the full plan". Every location with
  its state (published, archived, needs setup, not selected, inactive are shown and named as left out). The basis line
  says hours are scheduled business hours, not worked time or pay; costs are unavailable; fairness basis with known and
  unknown counts; a partial search may have missed a better option. `INPUT_LIMIT`/`RESULT_LIMIT`, no options and stale
  options each have their own card.
- **Review.** The full option: summary, every added shift (person, day, time, location, position, Lead), every replaced
  draft shift, every open block, every listed issue, and the counts of anything the server didn't list. The parser
  refuses a review whose lists disagree with its counts, that isn't one of its comparison's options, or that carries a
  read handle while not apply-eligible, so a shortened set can't be approved. Approval needs the read handle, the
  acknowledgement "I reviewed all proposed changes and remaining gaps", weekly on and an unexpired plan. "Save as draft"
  sends the whole set once; the copy says nothing is published and nobody is notified. Decline is always offered while
  weekly is on (a stale plan too). Look-only plans show why and offer Decline and Back to options.
- **Outcomes.** Saved: the receipt (saved at, added, replaced, kept) and progress (still as saved, published, coverage
  now; draft, published, partly published, changed, can't check), with the line that a receipt isn't attendance or
  coverage proof. Declined, not saved and unavailable each have their card. Opening a plan that was already decided
  gets 409 from `read_week_plan`; the UI then sends `check_week_plan` and shows its outcome.
- **Leases and privacy.** Each private answer (ready, saved) is held for its `validForMs`, measured from when the
  request was sent. Like the app's other private readers it renews at 70% of the lease while the Owner is here, only by
  observations: the same comparison command (its original ID), a new `read_week_plan`, or a new `check_week_plan`. If
  renewal fails, the details are cleared at expiry ("Details hidden · Show again"). Stepping away (hidden or blurred)
  clears them; coming back observes again. A changed `authority` clears everything seen under the old one. 401/403
  clears the screen and the stored pending approval ("Your session ended · Sign in").
- **Uncertain approval.** Before sending, the approval's metadata only (`reviewId`, `requestId`, `termsDigest`,
  `readReceiptId`, `acknowledged`, `authority`) goes to sessionStorage under `nevora.rondo.weekly.pendingApply.v1`. On
  a dropped connection, a 503 other than `disabled`, or an unreadable 200, the UI keeps it and checks the review. Saved
  with `receipt.operationId === requestId` is "Saved as a draft schedule"; saved under another operation is "This plan
  was already saved". `not_saved` (only from a successful check) offers "Send the same approval again", which resends
  the exact original command and ID. `unavailable` keeps it uncertain with Check again and the same resend. After a
  reload the pending approval comes back as "We couldn't confirm your approval" and is checked, never resent on its own.
  If the check answers under a different authority, the pending approval is dropped as foreign. 400 and 429 end the
  approval; 409 checks once, then ends it and re-reads the plan ("Something changed first"). A `disabled` answer is
  checked like an uncertain one. Decline custody is kept in memory and resent with its own ID if unconfirmed (the
  contract persists only apply).

## Files

- `src/app/app/ai-manager/weekly/page.tsx` (new): gate, weekly switch, bootstrap.
- `src/components/owner-advisor/weekly/weekly-page.tsx`, `weekly.css` (new; scoped to `.wk`, B tokens, adds no rule to a
  shared sheet; reuses the kit's cards, rows, pills, state cards, toasts and Add employee's checklist rows).
- `src/lib/owner-advisor/weekly-client.ts` (new): strict parsers, transport, pending-approval storage, words.
- `src/lib/owner-advisor/weekly-client.test.ts` (new, 18 tests). `src/lib/owner-advisor/weekly-contracts.ts` (copied).
- `src/components/owner-advisor/advisor.tsx`, `advisor.css`: the "Weekly plan" link beside "Company knowledge".
- `docs/handoffs/2026-11-16-rondo-weekly-ui/`: screenshots and both browser run logs.

## Checks run

- `npx tsc --noEmit -p .`: clean. `npx eslint` on the changed files: clean.
- `npx vitest run src/lib/owner-advisor src/components/owner-advisor src/test/phosphor-icon-weight.test.ts`: 41 files,
  377 tests pass. The client tests include resending a pending approval through the backend's own `parseWeeklyCommand`.
  The full suite was not re-run.
- Browser (Playwright on the repo's ui-scan harness: the real local app on an owned embedded Postgres with the fictional
  "Northside QA Workforce", Owner QAOWNER). **The weekly API was MOCKED** by route interception with a stateful mock
  written from the actual DTOs (`weekly-mock.mjs`, fictional people and places). The weekly switch was set for the run
  in a scratch copy of the harness only. Logs: `browser-run-weekly-on.txt`, `browser-run-weekly-off.txt`.
  - Widths 320, 390, 430, 768, 1440 on the planner; 320/390/1440 on options and review; 390/1440 on saved. 25 measured
    screens with weekly on and 3 with weekly off: no horizontal overflow, nothing clipped.
  - Covered: loading, every option state (complete, partial with issues, look-only no change, rule-blocked,
    search stopped early, input limit, stale options), both modes, both scopes, replaced draft shifts, full review,
    acknowledgement by keyboard, approve, decline, stale plan and its decline, saved progress in all five states, opening
    a decided plan, 409/429/400 on approval, lost answer after a committed save (failed first check, reload, recovered by
    check with no second apply), not saved then the same-ID resend, foreign custody after reload, revoked session (no
    names left in the page, pending cleared), lease renewal, lease expiry with renewal failing (details hidden, no names
    left), Show again, stepping away, weekly off (planner off; an approved plan's link shows its receipt only).
  - Not covered: screen-reader output, real Safari/iOS, real network timing, EN/ES model semantics (not claimed).

## For Codex: contract notes and questions

1. **Lease renewal load.** `validForMs` is at most 15 s, so a review on screen renews about every 10 s with a new
   `read_week_plan` (and the options with the same `compare_week` replay, which re-captures the source). That follows
   the existing private-reader behaviour; say if you want a cheaper renewal path or a longer cap.
2. **Reading a decided plan returns 409** (service: `applied_operation || declined_operation` → conflict). The UI
   recovers with `check_week_plan`. A terminal `read_week_plan` answer would save a round trip.
3. **`receipt.operationId` equals the apply `requestId`** (from the service). The UI relies on that to tell "your
   approval saved it" from "already saved".
4. **Week range.** The UI offers one week back to eight ahead. Tell me if the server allows a different range.
5. **Assembly.** Switch the weekly prop to the registry property; keep or replace `weekly-contracts.ts` with Codex's
   newer file (additive types only). The model projection's `reviewHref` should be `/app/ai-manager/weekly?review=<id>`.
6. **Owner Spanish UI** still doesn't exist; this page is English like the rest of the Owner chrome.
7. **Combined QA still owed:** the real route with the real session, the lost-answer and same-ID retry against the real
   receipt custody, weekly-off recovery, and authority/session changes.

## Next

Waiting for Codex's assembly and real-API QA. No other weekly or import endpoint was invented.

## Craft pass (Nov 16, 2026)

The screens were revised to the app's own button pairs, rows, type sizes and spacing after Jose's review. Details, measurements
and before/after captures: `docs/handoffs/2026-11-16-ui-craft-pass/`. No contract, request or recovery rule changed.

## Codex integration follow-up (Nov 16, 2026, against Codex `dfaa5447`)

Client-only; no backend file was edited (Codex's worktree was only read).

1. **Citation allowlist** (`src/components/owner-advisor/public-response.ts`). Answer and briefing sources now also accept
   exactly `/app/ai-manager/weekly?review=<UUIDv4>` (the backend's `reviewHref`) and
   `/api/owner/advisor/knowledge/entries/<UUIDv4>/versions/<UUIDv4>` (the backend's `knowledgeSourceHref`), lowercase.
   Extra query fields, other field names, fragments, trailing slashes, uppercase IDs, protocol-relative and external URLs
   are rejected (regressions in `public-response.rondo.test.ts`).
2. **Weekly model projection.** `weekly-contracts.ts` re-copied byte-for-byte from `dfaa5447` (adds
   `WeeklyModelComparison` and `WeeklyInspectionReference`). `parseAnswer` validates an optional `answer.weeklyPlans`
   with `parseWeeklyModelComparison` (`weekly-client.ts`): the full comparison checks, plus `comparisonId` UUIDv4,
   `occurrence` 0 to `ADVISOR_MAX_TOOL_CALLS - 1`, `expiresAt`, `sourceFence` (64 lowercase hex), mode
   `FILL_GAPS_ONLY`, each option's `reviewHref` equal to its own review link, and no `readReceiptId`, `changes`,
   `receipt`, `command` or `acknowledged` anywhere in it. An answer that carries `weeklyInspectionRefs` is rejected.
   Legacy answers and the `{notebookRevision, taskId}` context shape are unchanged. `contracts.ts` and
   `workflow-contracts.ts` were not copied (backend-owned); the parsed answer type adds `weeklyPlans` locally.
3. **24:00 end boundary** (`weekly-client.ts`). Gap and shift end times accept `24:00`; start times never do;
   overnight ends (22:00 to 02:00) stay valid; `24:30`/`25:00` are refused. `24:00` reads "12:00 AM". Regressions in
   `weekly-client.test.ts`; seen in the browser as "Sat, Nov 21 · 8:00 PM–12:00 AM" (mocked API).
4. **Weekly switch.** `weekly/page.tsx` still reads `process.env.NEVORA_OWNER_ADVISOR_WEEKLY_ENABLED === "true"` on this
   older base; switch to `readFeatureFlags(process.env).ownerAdvisorWeekly` at assembly.

Checks: `tsc` and `eslint` clean; `vitest run src/lib/owner-advisor src/components/owner-advisor
src/test/phosphor-icon-weight.test.ts`: 42 files, 404 tests pass; weekly browser pass (mocked API): all flows, 25
measured screens, no overflow or clipping, no page errors. Kept local and unpushed.

## Saved coverage scope follow-up (Nov 16, 2026)

Client-only, for Codex's backend fix that measures saved coverage only over the locations the reviewed comparison
included. No backend file or shared flag was changed; Codex's worktree was only read.

- `weekly-contracts.ts` re-copied unchanged from Codex's current working tree (adds optional
  `WeeklyProgress.coverageScope`; sha256 prefix `ab8c477118ae97fd`, identical bytes).
- `weekly-client.ts` parses the optional `coverageScope` (`includedLocationIds` unique location IDs, `changed`
  boolean) and keeps it. A changed scope is accepted only with the `changed` state. Answers without it stay readable.
- Saved screen ("The schedule now"): the Coverage row now says it counts only the N locations in the reviewed plan,
  naming them when there are up to three. When the scope changed, a row reads "Locations changed since the review: The
  locations that can be planned this week changed after you reviewed. Coverage still counts only the N locations in the
  reviewed plan." When coverage can't be measured, the row reads "Not available" with "A location in the reviewed plan
  can't be measured right now". An older answer without the scope keeps its plain Coverage row. The status chip reads
  "Changed" (was "Changed since saving") so it stays on the card's title line on phones.
- Row details in both Rondo areas now wrap on desktop instead of ending in an ellipsis; the browser clip check now
  covers row details too.
- Tests: four parser regressions in `weekly-client.test.ts` (unchanged, changed, null coverage, older and malformed);
  42 files, 408 tests pass; `tsc` and `eslint` clean. Browser (mocked API): no scope, unchanged, changed and
  unmeasurable at 390, changed at 1440, unchanged at 320 (`w5b-scope-*`), plus every other weekly and knowledge flow:
  weekly 31 and knowledge 28 measured screens, no overflow or clipping, no page errors.
- Harness note: right after a page load in the dev server, the weekly form can be present 0 or 2 times for a moment
  before settling to exactly 1; the script now waits for that. It isn't visible in the product.

Kept local and unpushed.

## Unavailable comparison and copy pass (Nov 16, 2026, final for combined QA)

- An unavailable comparison is now one state card and nothing else: no "The schedule now" card, no weekend-history or
  search rows, no location list. Its fairness counts are placeholders, not observed people, so they are never shown.
- `INPUT_LIMIT`: "Too large to compare · No options this time. Contact support if it keeps happening." (no narrowing
  advice, since the full cross-location source is required). `RESULT_LIMIT`: "Too many changes to compare · No options
  this time. Try fewer locations."
- Regression: `src/components/owner-advisor/weekly/weekly-page.test.tsx` renders both limits with zero placeholders and
  checks that no fairness, measurement, location or narrowing text appears for an input limit. The browser mock now
  returns zero placeholders and no locations for an input limit (`w8-unavailable-options-390`).
- Same-ID recovery keeps the original observation and failure; a new deliberate "Compare options" is a new request ID,
  as before.
- The copy pass (`docs/handoffs/2026-11-16-ui-craft-pass/README.md`, "Copy pass") is part of this source.

Checks: `tsc` and `eslint` clean; 43 files, 411 tests pass; weekly browser pass (mocked API) on this code: all flows,
31 measured screens, no overflow or clipping, no page errors. Local and unpushed.

## Search row follow-up (Nov 16, 2026, Codex combined QA on 9ba86c4d)

- "Search · Stopped early" now appears only when an option's status is `BUDGET_EXHAUSTED`. A `partial` comparison whose
  searches completed (unknown weekend history, left-out locations, omitted details) shows a neutral "Information ·
  Partial" row instead. A complete comparison shows neither.
- Regressions in `src/components/owner-advisor/weekly/weekly-page.test.tsx` (partial with completed searches, budget
  exhausted, complete). Browser (mocked API): `w8-partialInfo-options-390` and `w8-exhausted-options-390`.
- Checks: `tsc` and `eslint` clean; 43 files, 414 tests pass; weekly browser pass: all flows, 32 measured screens, no
  overflow or clipping, no page errors. Local and unpushed.

## Axe back-link contrast at 768px (Nov 16, 2026, Codex real-API QA on 9ba86c4d)

Codex's axe run reported `.c-nav__back` at 1.08:1 (`#fdfefd` on `#f2f5f4`) at 768px. Investigated before changing any
design; Codex's failure evidence is untouched.

- **Not specific to the Rondo screens.** The same axe rule reports the identical 1.08:1 on the band back link of every
  approved pushed page checked (Company profile `.q-nav__l`, a person's page, Positions, Help) at 768, 1024 and 1440px,
  and on the knowledge and weekly pages alike. Phones pass because their hero is a real background.
- **Cause.** From 768px the teal band is painted with `border-image` on the page title; the back link's own ancestors
  (`.c-nav`, `.c-page`, `main.page-frame`) report transparent or the canvas `#f2f5f4`, so axe compares white with the
  grey canvas. It is the same row at the same height whatever the scroll or resize state, so it isn't transient.
- **Real contrast.** Sampled from the rendered pixels right of the link: band `rgb(12,114,108)` (`#0C726C`), text
  `rgba(255,255,255,.86)` composites to `rgb(221,235,234)`: **4.71:1**, above AA 4.5:1, on the weekly page and on the
  approved references at 768 and 1440 alike (matches DESIGN.MD's "4.7:1 at the lightest stop").
- **No UI change made.** A per-page patch would diverge from the approved pages. If a clean automated axe result is
  wanted, the fix belongs in the shared band layer (paint `--b-band-solid` as a real background behind the band's back
  link row, as DESIGN.MD B1 already intends for border-image bands), checked across all pushed pages; that is a shared
  shell decision, not part of this slice. The top bar's `⌘K` hint (3.55:1) is also shared shell, not Rondo.

UI source for QA remains `ddcc2194`; this entry is documentation only.
