# Owner premium round: hand-back (Nov 21, 2026)

Jose reviewed the Owner screens after the Nov 20 polish and asked for a second pass: no light tinted buttons, labels or
message strips ("slop"), no "yellow box with some message inside", a premium check mark with motion, organised
confirmations, square buttons. This note covers the Owner side. The shared kit parts were built and pushed by the
Employee session (`d1152a0f8`, `48a124efa`); this work sits on top of them.

## Source
- Branch `claude-codex-collab-nevora`. Base: the shared branch tip this was built on (see the commit list in the push).
- Commits: code, then guide text and DESIGN.MD, then the six rebuilt guides, then these notes.
- Rules: DESIGN.MD, "Owner premium round (Nov 21, 2026)".

## What changed (presentation; exceptions listed under "Behaviour")
- **Success mark.** `BDoneMark` is a solid green disc with a white tick it draws once; every success mark in Owner and
  shared files uses it, and the signed-out finishes copy it.
- **Results and confirms.** One result pattern and one confirm block (`src/components/owner-b/decision-parts.tsx`)
  across time off, swaps, cover, call-outs, corrections, Delete shift, Deactivate, Remove tablet and batch timecard
  approval. Results replace their buttons or form.
- **Timecards.** Plain wording, a titled batch confirm with Cancel, a batch result that replaces the select panel, one
  amber note for a lost answer, "Finalize timecard" (it acts on one timecard), "Next timecard" in the footer.
- **Schedule.** White shift capsules; the day view is a timeline (`src/lib/scheduling/day-axis.ts`).
- **People, tablets, updates, exports, account.** Tablets list rows, the update review step, the export result, save
  results with a fact line, delete-account errors.
- **Owner leftovers on the kit.** Buttons, counts, status labels, message blocks, icon circles and figures in
  Owner-only sheets; 10px button corners; no tint behind words.

## Behaviour (small, client-side; no request, payload or authorization changed)
- `activeNavigationHref`: nothing new since Nov 20.
- The toaster skips the time off decision toast on `/app/requests`, where the list shows the result inline.
- A decision's result is kept in client state until the person leaves the page (`owner-b/kept-result.tsx`), because
  the page's quiet re-read used to drop it.
- Batch timecard confirm gained Cancel (drops the review and its tick, keeps the selection). The batch result survives
  the background read; it clears on expiry, window blur and Done.
- Publishing an update adds `?published=1` on the client redirect so the update's page can show its result once.
- Removing a tablet no longer raises the client-side "removed" toast (the row is the result).
- Delete account keeps the tick after a wrong password (client state).
- "Check again" and "Check and continue" call the same replay as the old retry buttons.

## Evidence
- `docs/product/review-2026-11-21-owner-premium/`: Jose's seven boards with his picks (1A, 2B, 3A, duotone, timeline,
  rows between hairlines, squarer 10px), pictures of the results, and the two confirmation reviews.
- Local harness only (fictional data, a throwaway database). Type check 0 errors, oxlint clean, guides 6 of 6.
- Full suite on the final tree, after the guide rebuild: 15,920 pass, 0 fail.
- A computed-colour scan of 72 Owner routes and the decision flows at 1440 and 390 found no tinted button, label or
  message left (one row-hover tint that only the test browser's touch context reports).
- Not checked: screen reader, a keyboard walk, WebKit, real iOS Safari, 200% text on the new screens.

## For Codex
- Nine browser QA scripts under `scripts/` follow the new wording but were not run here (they need the hosted or
  database-backed environments): `phase-d-browser-qa.mjs`, `phase-e-communications-browser-scenarios.mjs`,
  `phase-e-navigation-browser-scenarios.mjs`, `browser-render-readiness.mjs` and its check,
  `payroll-exports-ui-qa.mjs`, `payroll-export-privacy-qa.mjs`, `company-setup-qa.mjs`, `six-findings-ui-qa.mjs`.
  Several of these were already stale before this round ("Generate reviewed export", "Add device", "Rule setting").
- `src/test/integration/delegated-corrections-browser.integration.ts` has three updated strings and was not run.
- Server-side asks that would finish a finding: the add-shift redirect carries no flag, so the Schedule cannot say
  "Shift added" (`schedule/actions.ts:40`); the time off `decided` flag carries no name; "Publish … and changes anyway"
  publishes drafts only; a replayed lost Finalize came back "Blocked" although the first attempt had probably saved;
  `/api/notifications` sometimes answers 503 or shows "didn't load" on first open in the harness.

## Asking first (added later on Nov 21, after Jose answered "Yes, all three")
- Finalize on a timecard, every Decline and Close request, and a Rondo plan decline ask first (`owner-b/ask-step.ts`,
  `shift-request-decide.tsx`, `decision-parts.tsx`). Client-side step only: unit tests prove nothing is sent when the
  question shows or on the safe way out, and the original request is sent once on the commit.
- "Discard changes?" when leaving an edited Owner or Manager form (`kit/use-discard-guard.ts`, `kit/discard-dialog.tsx`).
  Known gaps: browser Back is caught only where the Navigation API exists (Chromium tested; older browsers may still
  lose edits on Back); other programmatic `router.push` calls outside the forms and the finder are not intercepted;
  Add shift and Add employee reload their content when the window loses focus, taking an edit with them.
- QA scripts that leave a still-dirty form by reload now meet the browser's own prompt, which Playwright accepts by
  default: `phase-c-breaks-ui-qa.mjs`, `company-setup-qa.mjs`, the two `readiness-*` integration tests. Not run here.
- Employee forms with the same silent loss (out of scope here): `availability-editor.tsx`, `availability-signature.tsx`,
  the Lead's team message compose, Work restrictions requests.

## Date ranges (added later on Nov 21)
- Jose: "Use Nov 16–22 across Owner screens"; across months "Nov 30–Dec 6". One helper, `dateRange` in
  `src/lib/duration-format.ts`; the shared formatters (`dateRangeText`, `formatWeekRange`, `periodRange`,
  `periodLabel`, `availabilityWeekLabel`, `rangeText`, and the Schedule, Home, Timecards, Insights and Rondo ones)
  call it. Employee screens that use those formatters changed with them (Availability, My pay, notification titles).
- Two visible side effects: Spanish payroll import and export periods read "16–22 nov" (they said "16 – 22 de nov");
  a one-day pay period reads "Oct 12", not "Oct 12–12".
- Left spaced, for Jose: ranges with weekday names (Time off requests, Things to do, the planning window card).
  Left as they are: time ranges, server sentences (`formatCalendarRange`), the Christmas bonus year label
  ("Oct 2025 – Sep 2026"), the PDFs.

## Open for Jose
- Should a range with weekday names close its dash too ("Fri, Dec 4–Sun, Dec 6") or stay spaced?
- One date-range form ("Nov 16 – 22" or "Nov 16–22").
- New client wording to approve: the result titles and lines in `time-off-admin/copy.ts`, `review-details/copy.ts`
  and `owner-b/moments-copy.ts` (English and Spanish).

## Release sequence
Development is the primary working and acceptance release. Codex joins this branch into Development and verifies the
combined backend and UI there on the hosted environment; the exact verified release is promoted to main and
production only after Jose's approval. This hand-back authorizes no main merge, no production activation and no paid
service. Data in every picture is synthetic.
