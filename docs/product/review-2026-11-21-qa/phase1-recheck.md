# Phase 1 re-check of the Nov 21 QA (Nov 22, 2026)

An independent re-run of the QA's checks for every Phase 1 fix in
[the QA 1121 fix plan](../../handoffs/2026-11-22-qa1121-fix-plan.md), on `claude-codex-collab-nevora` at `ef1dfdf1`.
No application code was changed.

**Setup**

- The owned test app (`next dev`) ran on a throwaway local Postgres with the Owner rich scan's fictional business
  (Northside Café & Bakery, two locations), in headless Chromium with reduced motion. No real mail, SMS, payments or AI
  provider were used.
- Same seed as `tools/ui-scan` with `NEVORA_SCAN_RICH_OWNER=1`. On top of it, this re-check added:
  - Daniel Cruz and Carlos Vega as Condado-only Managers. Daniel has Publish schedules at Condado; Carlos has no grants.
  - Elena Ruiz stays a company-wide Manager with no grants.
  - Draft weeks for Dec 14, 21 and 28.
- A lost reply means the server ran the action and answered 200, then the browser saw a network failure. This is the
  QA's method, and the method in `readiness-shift-concurrency-browser.integration.ts`.
- The checks live in one scratch test, beside the scan harness, never in the app (copy:
  [`data/recheck.integration.ts.txt`](phase1-recheck/data/recheck.integration.ts.txt)). Raw results are in
  `phase1-recheck/data/`.
- Runs:
  - `recheck-after.json`: the full run on `ef1dfdf1`.
  - `recheck-after2.json`: A3-02 on the publishing click, and A3-05 to a published week.
  - `recheck-after3.json` and `recheck-before.json`: the same lock measurement on `ef1dfdf1` and on the pre-fix base
    `5cf16928`. `recheck-before.json` also has before screenshots for A3-01, A3-02, A3-05 and A3-06.
  - `diag-a3-02-run1.json`, `diag-a3-02-run2.json` and `diag-a3-02-run3-in-page-drop.json`: A3-02 follow-ups. They
    record the console, page errors, every request and the page's own action `fetch` around the click, a pass-through
    control, and the final in-page drop (note 1).

## Results

| Finding | Check | Result | Evidence |
|---|---|---|---|
| A3-01 Add shift, lost reply | Owner at 1440 adds Gabriela, Jan 5, 9:00 AM–1:00 PM. The reply is lost after the server answered 200. Then Save shift again. | **PASS** | Amber note "This change could not be confirmed. It may already be on the schedule…" with **Check the schedule** → `/app/schedule?week=2027-01-04&location=loc-1&day=2027-01-05#schedule-employee-OWN-GABY` (the shift is on that day). Database: 0 → 1 shift; still 1 after saving again. The second save says "…It may be the one you just saved; check the schedule…". Before: "Employee already has an overlapping shift." `a3-01-*.png`, `before-a3-01-*.png`, `recheck-after.json` → `A3-01` |
| A3-02 Publish, lost reply: Build and publish (`/app/schedule/publish`, Owner) | "Publish 2 drafts anyway" (Dec 21), reply lost | **PASS** | Amber "Publishing could not be confirmed. The schedules may already be published…" with **Check the schedule**. Both locations published once (8 notifications, both rows PUBLISHED, the form stays on the page). Before: "This page didn't load. Nothing was changed." `a3-02-build-and-publish-lost-reply-after-1440.png`, `before-a3-02-*.png` |
| A3-02 Publish, lost reply: planning panel | "Publish Calle Loíza anyway" (Dec 14), reply dropped in the page after the server answered (note 1) | **PASS** | Amber "Publishing Calle Loíza could not be confirmed. It may already be published; check the schedule before you publish again." with **Check the schedule** → `/app/schedule?week=2026-12-14&location=loc-1`. "Nothing was changed" never appeared. Database: DRAFT → PUBLISHED, 4 notifications (one per person). No console errors. `a3-02-planning-panel-lost-reply-after-1440.png`, `data/diag-a3-02-run3-in-page-drop.json` |
| A3-02 Publish, lost reply: a Manager's per-location form (new in A3-05) | Daniel, "Publish Condado anyway" (Dec 14), reply dropped in the page (note 1) | **PASS** | The amber unconfirmed note showed 0.8 s after the click. About 7 s later the page re-read itself and showed "Everything planned this week is published." "Nothing was changed" never appeared. Database: DRAFT → PUBLISHED, 4 notifications. No console errors. `a3-02-manager-publish-lost-reply-then-reread-1440.png`, `data/diag-a3-02-run3-in-page-drop.json` |
| A3-03 Time export kept | Owner exports Nov 2–8 and downloads the CSV. The tab stays open 703 s, then Download CSV again from Recent exports. Elena (another Manager) asks for the receipt. | **PASS** | "Export ready" was gone after the wait. The Recent exports card listed "Nov 2 – Nov 8 · 11 people · Exported Nov 22, 5:13 AM". The second download is byte-identical (SHA-256 `4bf66613…f1f7` both times). Elena: GET lists 0 receipts; POST of the Owner's receipt → **404** `{"state":"not_found"}`. A POST without the export headers → 403. `a3-03-recent-exports-after-1440.png`, `recheck-after.json` → `A3-03:*` |
| A3-05 Manager publish | Daniel (Condado, with the grant) and Carlos (Condado, no grant), 1440 | **PASS** | Daniel: his schedule shows **Build and publish**. The page has one form, "Publish Condado", then "Publish Condado anyway" after the warning review. Dec 14 became PUBLISHED. Carlos: no Build and publish. The publish page says "Publishing permission needed. Publishing needs the Publish schedules permission… An Owner can give it to you." Before: "Company-wide access needed… sign in again" for both. `a3-05-*.png`, `before-a3-05-*.png`, `recheck-after2.json` → `A3-05`. The new card still carries a "Sign in again" link (note 3). |
| A3-06 Permission vs. sign-out | Carlos, Daniel and Elena on Things to do, Time corrections and Insights (1440) | **PARTIAL** | Things to do (Carlos, Daniel): "You don't have access to Things to do. Ask the Owner if you need it." (before: "Your session ended. Sign in again"). Time corrections (Elena): "You don't have access to time corrections. Ask the Owner if you need it." (before: "Correction access ended… Sign in again"). Still wrong on both screens: a "Your access changed… Ask your manager if you still need it." toast. Location Managers on Time corrections and Insights still get "Company-wide access needed… If your access just changed, sign in again" with a Sign in again link (unchanged from before). Insights' new "You don't have access to insights" was **not reached** (note 4). `a3-06-*.png`, `before-a3-06-*.png` |
| S-06 Find cover | Elena (company-wide, no Publish schedules) at 390, Find cover on the published Nov 23 week → Review replacement | **PASS** | "Publishing permission needed. This schedule is published, so saving this replacement also publishes it…" No acknowledgement checkbox (`#coverage-publication-consent` count 0), no Save replacement. `s-06-find-cover-no-publish-grant-390.png` |
| A3-07 Lock contention | One Owner tab loads Schedule, Team, Timecards and Things to do for 32 s after a warm-up. `pg_locks` sampled every 15 ms. Same method on `5cf16928` and `ef1dfdf1`. | **PASS** for the capability read; **contention not reduced** | Before: payroll writer locks on page loads. That's 32 samples of SHARE on `payroll_runs`, `time_entries`, `timecard_revisions`, `break_entries` and `payroll_run_revisions`, 105 of `employees` all rows `FOR UPDATE`, and 84 of the native payroll `LOCK TABLE`. After: none. Lock waits: 326 before, 319 after (6 page loads each; longest wait 522 ms vs. 1,260 ms). The QA saw 276 in 32 s. Owner Home still takes the payroll writer locks (note 5). `recheck-before.json`, `recheck-after3.json` → `A3-07` |
| A4-01 Employee Home, 200% text | James at 390. Default font 32px via CDP `Page.setFontSizes`; the viewport is resized to the page height (2,967 px) | **PASS** | Root font 32px. No horizontal overflow, no clipped text. The overlap probe hits only the Coming up date tiles ("MON" over "23"), where line boxes touch but glyphs don't. `a4-01-employee-home-390-text200.png`, `recheck-after.json` → `A4-01` |
| A4-02 Owner Home, 200% text | Owner at 1440, same method (1,902 px tall) | **PASS** (partial state) | No overflow or clipping. Quick actions read in full ("Add employee", "Send update"). The probe's hits are the closed "What this measures" text. The seed has no overdue payroll, so the QA's "Nov 2–8 has no payroll" line and payday date were not on screen to re-check. `a4-02-owner-home-1440-text200.png` |
| A4-03 Team rows | Owner Team at 1440 and 390: `aria-label` on each row link, plus `locator.ariaSnapshot()` | **PASS** | No row link has an `aria-label`. Names follow the visible text, for example "Gabriela Santos Front counter · Calle Loíza Not clocked in · 41 min". 8 names include the status, 0 include a phone number, at both widths. `a4-03-team-1440.png`, `data/A4-03-team-*.aria.yaml` |
| S-01 part 1 | Owner Schedule (90 s) and Team (60 s) in a fresh context with Fast 3G (562.5 ms, 180 KB/s down, 84 KB/s up) | **PASS** (wording) | Both showed "Still checking your access. This connection is slow. The page appears when the check finishes." Never "Couldn't check your access". Schedule's content appeared at 18.7 s, then turned into the checking state at 46.8 s; Team's at 18.2 s and 27.9 s. Neither came back within the window (part 2, still open). `s-01-still-checking-fast3g-1440.png` |
| S-09 Rondo day plans | Owner, `/app/ai-manager`, Compare day plans for today (now 1:22 AM) and Nov 25. Coverage is 00:00–24:00, as in the QA fixture | **PASS** for day plans | Today: "Times before 1:30 AM have passed, so these plans start at 1:30 AM or later." The plan proposed no shifts ("Search limit reached"), so no proposed time existed to fall before now. Nov 25: 2 plans, each 1 shift of 8 h (12:00–8:00 AM), none over 10 h. The comparison uses hours and "time slots"; no "planning ledger" or "coverage minutes". The same page still says "Current planning ledger, including drafts" under each Needs your attention item (note 6). `s-09-*.png`, `data/S-09-*-plans.json` |
| axe on touched screens | axe-core 4.14.1, WCAG 2.0/2.1 A and AA plus 2.2 AA, 18 scans | **FAIL** (expected 0 serious) | 0 critical. Serious: `label-content-name-mismatch` (the sidebar "Things to do, 18" link on most screens; Home and Employee Home rows) = A4-04. `color-contrast` 4.19:1 on the Team filter count = A4-06. The white band tabs on Time exports, a known false positive. Masthead eyebrow and summary at 4.48:1 on Find cover's Review replacement at 390. The Phase 1 additions (amber notes, Recent exports card, Manager publish forms, denial cards) added none: 0 violations on Daniel's schedule and publish page, Carlos's publish page and his Time corrections and Insights pages. `recheck-after.json` → `AXE` |

## Failing, partial and not run

1. **A3-02: how the lost reply was produced.** In the first runs the reply was dropped with Playwright's `page.route`
   (`route.fetch`, then `route.abort`). That works for Add shift and "Publish drafts". For the two forms that use
   `publishScheduleAction`, it never reached the browser:
   - The page's own `fetch` resolved 200 with the full body (53,035 bytes).
   - React's Flight client then threw `TypeError: Cannot read properties of null (reading 'enqueueModel')` while
     rendering `<SchedulePage>`, and the route error said "Nothing was changed".
   - Passing the real response straight through with `route.fulfill`, with no drop, gave the same error. So that screen
     came from the interception, not from a lost reply (`data/diag-a3-02-run1.json`, `run2.json`).

   The final method drops the reply inside the page instead. Before the click, `window.fetch` is wrapped so that the
   next request carrying `next-action` goes to the server, its whole response is read and discarded, and the call
   throws `TypeError('Failed to fetch')`. The wrapper is then removed. With it, all four cases behaved the same way
   (`data/diag-a3-02-run3-in-page-drop.json`):

   | Case | Amber note with Check the schedule | "Nothing was changed" | Database | Console errors |
   |---|---|---|---|---|
   | Owner, planning panel, "Publish Calle Loíza anyway" | Yes, stays | No | Published once, 4 notifications | None |
   | Daniel, Build and publish, "Publish Condado anyway" | Yes, then the page re-reads and shows "Everything planned this week is published." | No | Published once, 4 notifications | None |
   | Owner, Build and publish, "Publish 2 drafts anyway" (control) | Yes, then the same re-read | No | Both locations published once, 8 notifications | None |
   | Owner, Add shift (control) | Yes, stays, with Check the schedule → the shift's day | No | 1 shift saved | None |

   Small things seen on the planning panel: after the note, "Publish Calle Loíza anyway" is still offered, so the next
   step depends on the person following the note. The note sits beside "Return to draft" in an uneven row. The panel
   also says "1 employees without a weekly hour target"; that grammar predates these fixes.
2. **A3-06's toast.** Things to do and Time corrections now say "You don't have access… Ask the Owner", but the same
   screens also raise "Your access changed. This information was cleared from the screen. Ask your manager if you still
   need it." Nothing changed, and the person is a Manager. This is the toast the QA reported with A3-06.
3. **"Sign in again" on permission pages.** Some server-side refusal cards still offer a Sign in again link to a
   Manager who is signed in and only lacks access:
   - A location Manager's Time corrections and Insights read "Company-wide access needed… If your access just changed,
     sign in again" (unchanged).
   - The new "Publishing permission needed" card also keeps a Sign in again link.

   Signing in again wouldn't help in either case. The plan sends the other 44 files that read a 403 as a sign-out to
   the Phase 2 sweep.
4. **Not run: the Insights "You don't have access to insights" state.** None of these roles reaches it. Elena
   (company-wide) is allowed into Insights. A location Manager is stopped by the server page in note 3 before the client
   reads `/api/reports`. Reaching it would take a session that passes the page check and is then refused by the API.
   This re-check didn't build that state.
5. **A3-07: the fix works, and contention remains.** The layout's capability read no longer takes payroll writer locks,
   but total lock waits per page load didn't fall (326 vs. 319 in about 35 s). Other reads still take
   `workspaces … FOR NO KEY UPDATE` (the most-sampled lock in both runs), `FOR SHARE` on the workspace, session and
   employee rows, and some `employees … FOR UPDATE`. Owner Home also still takes the full payroll writer locks through
   `readHomePayrollStatus` → `readPayrollBacklog` (`src/app/app/my-pay/next-pay.ts:25`): seen in runs 1 and 2, which
   loaded Home, and not in run 3, which didn't. Home took about 60 s per load on this dev server, even warm.

   All of this is `next dev`. The QA's production-build caveat still applies.
6. **S-09 wording outside the day plans.** The attention items keep "Current planning ledger, including drafts" and
   "planning periods… Maximum staffing shortfall: 1" (`src/lib/owner-advisor/briefing.ts:76,84`). The fix plan's Phase 2
   Rondo pass already lists "S-09 wording". The "no time before now" rule was only partly exercised: today's plan
   proposed no shifts.
7. **A4-02 state.** The seed has no overdue payroll, so the two lines the QA saw overlap weren't on screen. Small fixed
   px text (week chart day labels, "Needs your answer", "MON") doesn't scale at 200%. The fix plan lists this for
   Phase 2.
8. **Other gaps.**
   - Chromium only (no WebKit, no real iPhone or screen reader).
   - `next dev` only.
   - Keyboard: only the A3-01 **Check the schedule** link was focused, and from script. Its `:focus-visible` ring was
     not exercised, so focus wasn't judged.
   - Before screenshots exist only for A3-01, A3-02, A3-05 and A3-06. The QA's own screenshots are on the Mac.
   - The full run's first lock sample (`recheck-after.json` → `A3-07`) was taken while the dev server compiled. Use
     `recheck-before.json` and `recheck-after3.json` for the comparison.
