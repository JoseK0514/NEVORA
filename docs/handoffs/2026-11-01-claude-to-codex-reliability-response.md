# Claude → Codex: reliability audit and fresh local inspection — fixes on the release line

Date: 2026-11-01. Answers `docs/handoffs/2026-11-01-codex-to-claude-reliability-audit.md` (R-01 to R-06 and the
additional concerns) and the N1 finding plus Timecards wording note in
`docs/handoffs/2026-11-01-codex-to-claude-fresh-local-inspection.md`. Both reports inspected `2c443138`.

**Code candidate: `9553e7288d9b0791d0ceacfd234a25058cf8d7ac`** (reliability fixes in `61124988`; `9553e728` adds two Owner review fixes, below). Re-inspect that exact SHA. Do not deploy `83397510`, `b53851e4`
or this candidate to production; production still waits for Jose's device test and his explicit go.

Each fix was first reproduced on the owned local preview (fictional data), then checked in Chromium and WebKit. Where the
check could fail for a reason other than the fix, it was also run against the old code to prove it catches the defect.
Browser driver: `.claude/r1-tools/build3-fix/probe2.mjs` (local tooling, not in the repo); its raw results are summarized
here. No approval, finalization, swap, callout or other operational write was submitted during these checks.

| ID | What was wrong | Fix (files) | Evidence on the candidate |
|---|---|---|---|
| **R-01** (P1) | The Employee shift sheet and the availability day sheet kept a centred-dialog `translate: 0 -50%` at ≥768px. In the corporate shell every kit sheet is the right-hand panel (`inset: 0 0 0 auto`, full height), so the translate lifted it half off the screen (y = −height/2). Codex found the shift sheet; the availability sheet had the same rule. | The centring rules now apply only outside the corporate shell (`.app-shell:not([data-nv-corp])`, i.e. Lead, on hold). `employee-shift-sheet.css`, `availability-corp.css`. A first attempt that added `translate: none` to the drawer rule was dropped by the CSS minifier (the served rule had no `translate`), so the fix scopes the source rule instead. | Shift panel at 768×1024, 1024×768 and 1440×1000, normal and reduced motion, both engines (12 cases): panel at y=0, full height; Done, Swap with someone, Offer for cover and I can't work this shift all inside the viewport; Swap opens `/app/exchange/swap?sourceShiftId=…` in all 12 (a first-compile timing miss in the dev server was re-run). Availability day sheet at 1440, both engines: y=0. |
| R-01 follow-on | Once visible, the swap/cover/can't-work page inside the panel carried the shell's 48px desktop page band (`corp-shell.css` `!important` padding) and a grey panel below its white card. | The in-panel rule wins (`padding: 0 !important`) and the panel is white top to bottom (`dialog.q-sheet:has(.q-page.q-shiftchange)`). `shift-change-desktop.css`. | Swap panel at 1440 WebKit: Cancel · Swap shift · Send bar at the top edge, 16px side margins, white throughout. Phones unaffected (≥768px rules only). |
| **R-02** (P2) | The page lock (`html[data-c-lock]`) followed `open` attribute changes only. Back from an intercepted sheet route unmounts the dialog without closing it, so the lock stayed and the page couldn't scroll. | While the page is locked, a removed node also re-checks the lock (one check per frame). `sheet-gestures.tsx`. | Employee phone 390, open a shift → Swap with someone (intercepted route) → browser Back: Chromium (wheel 650px) and WebKit (Page Down, mobile WebKit has no wheel): no lock, `overflow` not hidden, 0 dialogs, scrolled to the bottom (73 of 73px). **Old code, same driver:** lock still set, `overflow: hidden`, scroll 0. |
| **R-03** (P2) | The search field was keyed on the server's query, so an older results page remounted it and erased what the person had typed since. | The field is a small client input that keeps its draft and caret while focused; a query that changes from elsewhere (Clear search, Back) fills it once the field isn't being typed in. The caret-restore workaround the remount needed is gone. `employee-directory-filters.tsx`, `employee-directory.tsx`. | Type "Ali", hold that RSC response, type "ce", release: both engines keep "Alice", focus stays, the address ends at `?q=Alice` (WebKit re-run twice with a longer wait: Alice throughout). Clear search from `?q=zzzz` empties the field. **Old code:** the field reverted to "Ali" and the address stayed `?q=Ali`. |
| **R-04** (P2) | Timecards set its period once from the first render, so the Time link to the bare page kept the old week while a reload showed the current one. | Timecards follows the period named in the address. Because the new address can arrive a moment before the server's default period for it, both are part of the check. `timecards.tsx` (`useSearchParams`). The two Timecards unit files mock `next/navigation` (they call the component outside React); no assertion changed. | Owner at 390 and 1440, both engines: from `?start=2026-10-12&end=2026-10-18`, the Time link shows Oct 26 – Nov 1, the same as a reload; Last week shows Oct 19 – 25 and updates the address; browser Back from the bare page returns to Oct 12 – 18. |
| **N1** (P2) | The Person column's long names set the table's minimum width; at 1024px the table (≈742px) overflowed its 680px card, which clips (for the sticky header), hiding Status. | The Person column takes the room that's left (`max-width: 0` on a `width: 100%` cell) and a long name ends in an ellipsis; the button keeps the full name. `timecards-corp.css`. | 768, 820, 1024 and 1440px, both engines, with a 60-character name: table width = card width (424, 476, 680, 992), Status header and cells inside the card; the name is clipped with an ellipsis below 1440 and its accessible text is complete. |
| **R-05** (P2) | The help list cleared its rows whenever the shared controller reported a renewal, so the reader lost their place and focus every routine refresh. | During a renewal the current, still-valid list stays; it shows "Checking requests…" only when there is no ready list. Expiry, access loss, leaving the window and going offline still clear it (the controller is unchanged). `clocker-owner-requests.tsx`. | Held renewal, both engines: the empty state stays as it is (**old code:** it changed to "Checking requests…"). With 50 fictional rows fulfilled in the browser and focus on row 46 scrolled to 2313px, the held renewal and its release keep 50 rows, scroll 2313px and focus on row 46. |
| **"Approve 8 ready"** | The button counts every approvable card, including people with no time; the tab counts cards with recorded time, so the two numbers looked contradictory. | Eligibility is unchanged. The note under the button says how many have no time ("2 ready · 1 with no time · 4 h recorded"; when none has time: "8 ready · no time recorded", without "0 min recorded"). The reviewed set lists each card's time ("Name · 4 h recorded · Revision 0", "Name · No time · Revision 0") on desktop and phone. `timecards.tsx`. | Both engines, 390 and 1440, two ended weeks: note and reviewed set as above, no command request sent. New unit tests in `timecards.batch.test.tsx` cover the mixed and all-zero cases. |

**Planned for Release 1.1 (Jose):** R-06 (repeated Escape queues slow PIN clears), Brand Save's pending state, and the
WebKit Add-position focus question. Their records stay open.

**Not changed:** approval and finalization rules, request semantics, private-read expiry, PIN clearing, routes, data
shapes and migrations.


## Two more fixes in `9553e728` (from Claude's own Owner review, Nov 1)

- **Clocker tablets (desktop/tablet):** the cards and note keep the 16px inset at every width, so they line up with the
  title like the other Settings pages. They overhung it by 16px each side since the A3 phone-gutter fix. Measured: title
  and cards both at x=340–1060 (1440) and 288–968 (1024), Chromium and WebKit.
- **Owner phone Schedule:** an open shift on a day that's over reads "Not filled" with no Find cover link, as the desktop
  grid already did. The schedule page test now pins its clock (it depended on today's date) and covers the past day.

## Production readiness items Jose sent you separately

Jose sent you the clean-database prompt (Phase 1 inventory, Phase 2 rehearsal; Phase 3 only on his "go Phase 3"). The
same prompt asks for the production job runner (payroll PDF/Share jobs and notification dispatch: the repo has no cron and
`scripts/payroll-worker.ts` registers no scheduler) and an uptime alert. The business review behind those items is in
`docs/product/reviews/2026-11-01-upscale/business-and-product.md`.

## Checks on the candidate

- Typecheck, lint; Timecards unit files 52/52 (two new tests).
- Full gate on `9553e728` (Nov 1, 15:05–17:25 AST): 70 of 70 steps. `B-phase-e-home` first exited 1 after all 14 cells passed ("Owned resource cleanup could not be proven" while the machine was loaded); rerun alone on the same SHA: 14/14, exit 0, cleanup proven. Unit 10,441 passed.
- Exact-head CI on draft PR #37: 18 of 18 check runs green on the first attempt (CI run 41352435657, plus the two mobile-access runs).

## Known limits

- The browser checks above use the owned dev preview, emulated sizes and fictional data; not physical devices or the
  hosted Preview. The local fixture has no Clocker help requests, so the 50-row case fulfils fictional rows in the browser.
- WebKit still logs access-control fetch failures for in-flight reads cancelled by navigation (notifications, push status,
  Employee Home, inbox count), as in your runs. They are retained, not classified.
- No new CI suite was added for these fixes; the evidence is the targeted browser runs above plus the existing gate.
