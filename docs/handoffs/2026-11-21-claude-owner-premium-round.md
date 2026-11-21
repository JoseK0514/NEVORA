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

## Open for Jose
- Should Finalize ask first? Should every Decline ask first? Should leaving an edited settings form ask?
- One date-range form ("Nov 16 – 22" or "Nov 16–22").
- New client wording to approve: the result titles and lines in `time-off-admin/copy.ts`, `review-details/copy.ts`
  and `owner-b/moments-copy.ts` (English and Spanish).

## Release sequence
Development is the primary working and acceptance release. Codex joins this branch into Development and verifies the
combined backend and UI there on the hosted environment; the exact verified release is promoted to main and
production only after Jose's approval. This hand-back authorizes no main merge, no production activation and no paid
service. Data in every picture is synthetic.
