# WP3 report: Owner and Manager Home, Things to do, Team, person page, Add employee

**Patch:** `/private/tmp/claude-501/-Users-josek0514--claude-spares-spare-23XJTe/d762c6df-53eb-43b4-836f-475a53cde009/scratchpad/patches/wp3.patch`
**Stat:** 21 files changed, 382 insertions(+), 90 deletions(-). Nothing committed. No server module, API route, count or mutation handler changed.

All paths below are relative to the worktree `/private/tmp/claude-501/-Users-josek0514--claude-spares-spare-23XJTe/d762c6df-53eb-43b4-836f-475a53cde009/scratchpad/wt/wp3`.

## Findings

| ID | Status | What changed, or why not |
|---|---|---|
| BR-9 attendance words | Done in scope | Today's read already tells the states apart (`not_clocked_in` = started, `no_punches` = ended, `late` = first punch after start), so nothing is needed from Codex. Home tile and rows, Things to do sections and Team chips and filter use the three words. |
| BR-7 row facts | Partly | Time-correction rows say who asked and the day sent. The read carries no recorded or asked-for times, so "asked to start 20 min earlier" is not possible (see For Codex). Swap rows name both people. The band states what the count leaves out. Timecard counts are labelled on both screens. |
| OW-001 one primary | Done | Approve and Review are the tinted pill; Decline is a quiet text button. Same form, handlers and 44px targets. |
| BR-16 / AR-2 first week | Partly | Setup card moved to the top of Home. The "Set up your time clock" swap is not built: nothing Home loads says whether a tablet is registered. Setup card keeps its two steps for the same reason. |
| BR-3 / AR-10 person page | Mostly done | Hours card, sign-in status and a per-person Availability link added. "Shifts" opens the schedule at the person's location only, because Schedule has no one-person view. |
| BR-14 email helper | Done | Helper text under the email field, tied to the input with `aria-describedby`. |
| JR-5 invitation failure | Done (UI part) | `delivery_unavailable` now shows the support message, keeps the panel's status, and hides Send until Refresh. |
| AR-9 Availability rows | Done | Added to the Things to do side card and to Team tools (phone and desktop). |
| Import link | Done | "Import a staff list" in Team tools, Owners only, to `/app/employees/import`. |
| BR-11 Apply search | Done | The phone search's magnifier is now the Apply button with a 44px target; it was a 1px hidden control. |

## Strings changed or added (English-only surfaces, so no Spanish twins)

**Home** (`src/components/owner-b/home-b.tsx`)
- :75-79 tile "Missed" → "Not clocked in" (count of shifts in progress with no punch). It reads "Missed" only when none are in progress and some ended with no punch. Aria: "Not clocked in: N" plus ". Missed clock-ins: N" when both exist.
- :137 new row "N not clocked in"; :142 "N missed clock-in(s)" now covers ended shifts only.
- :176 Payday line "Before payroll" → "Pay period ended" / "Pay periods ended" (title "N timecards to review" unchanged).
- Request row sub "Ana Colon · Nov 21" → "Ana Colon and James Ortiz · Nov 21" when the counterpart is sent.

**Things to do** (`src/components/owner-b/inbox-b.tsx`, `src/components/manager-inbox-corp.tsx`, `src/lib/action-center/present.ts`)
- inbox-b :71 band sub "11 things need you" → "11 things need you · 18 more waiting for review" (only when something waits).
- manager-inbox-corp :155 new section "Not clocked in"; "Missed clock-ins" now holds ended shifts only.
- inbox-b chip "53 min late" → "Started 53 min ago".
- inbox-b :80 "Missed clock-ins may be missing from this list." → "People who haven’t clocked in may not be listed."
- present.ts :84-85 "Time correction waiting for review / James Ortiz · Recorded time correction." → "James Ortiz asked for a time correction / Sent Nov 10". Missing-entry kind: "… asked to add unrecorded time". No date: "Waiting for review".
- Swap row title "Ana Colon" → "Ana Colon and James Ortiz".
- manager-inbox-corp :95-98 timecard rows "Carlos, Daniel…" → "6 timecards · Carlos, Daniel…" with chip "Pay period ended" or "Pay period open".
- inbox-b :90 new row "Availability / Who can work, and when".

**Team** (`src/components/team-live.tsx`, `src/components/owner-b/team-b.tsx`, `src/components/team-desk-people.tsx`, `src/components/employee-directory.tsx`)
- team-live :49 chip "Late 55 min" → "Not clocked in · 55 min"; :51 new chip "Clocked in late".
- Filter "Late" → "Not clocked in"; sub "1 late now" → "1 not clocked in"; empty "No one is late." → "Everyone on shift has clocked in."
- employee-directory :68-69, :111-112 new rows "Availability / Who can work, and when" and "Import a staff list / Add many people at once".

**Person page** (`src/app/app/employees/[employeeId]/page.tsx`)
- :92-95 new sub under the name (Owner only): "Sign-in active", "Not invited yet", "Invited Nov 12, not activated", "Invitation expired", "No email, can’t sign in".
- :129-134 new card "Hours": "Scheduled today", "Scheduled this week", "Clocked this week / Includes breaks".
- Access row detail "No Clocker PIN yet" → "Not invited yet · No Clocker PIN yet" when both apply.

**Add employee** (`src/components/company-access/new-employee-form.tsx:46`)
- New: "Without an email, this person can clock in on the tablet but can’t sign in to NEVORA."

**Invitation panel** (`src/components/company-access/employee-invitation-panel.tsx:86`)
- For this case, "Invitation email is unavailable. Refresh current information before trying again." → "Email invitations aren’t turned on for this workplace yet. Contact support@thevelani.com."

## Tests
- `npx eslint` on every changed file: exit 0.
- `npx vitest run` on 43 related files: 556 tests passed. This covers present, Things to do, Home, the three employees pages, inbox, requests, leave-staffing, manager-dashboard, premium-home, ui-preview, app-shell, corp-upscale, company-access and b-viewport.
- New tests cover the attendance split, correction wording, counterpart, timecard chips, band sub, ghost pills, setup order, hours card, links, sign-in status and the hours read failing.
- Not run: `tsc`, the full suite, a browser. The invitation panel has no DOM test environment, so that change was checked by reading only.
- `src/test/integration/owner-inbox-browser.integration.ts` got the minimal edit `todo-missed` → `todo-not-clocked-in`, because its all-day fixture shift is now "Not clocked in". It was not run.

## For Codex
1. **Tablet registered flag (BR-16):** Home needs a boolean such as `clockerRegistered` on the Today read or dashboard data. Without it the UI cannot replace the attendance tiles with "Set up your time clock".
2. **Setup steps (AR-2):** the setup card only receives coverage rules and hour targets. It needs team size, first published schedule, time clock and PINs, and pay schedule set.
3. **Correction facts (BR-7):** `TIME_CORRECTION` items carry only the name, kind and created date. Recorded and asked-for times and the work date are needed for "asked to start 20 min earlier · Nov 10".
4. **Exchange kind (BR-7):** `ActionRequestFacts` should say swap or cover, so the row can read "swapping with" or "covered by" instead of "A and B".
5. **Delivery flag (JR-5):** add `deliveryAvailable` to `readInvitationStatus` so Send is hidden before the Owner tries.
6. **QA script:** `scripts/phase-d-browser-qa.mjs:366` has a fixed card order without `todo-not-clocked-in`; add it before `todo-missed`.
7. **Manager sign-in status:** only Owners read the invitation, so a Manager's person page says nothing about sign-in.

## Risks and browser checks for the coordinator
- **Files beyond the literal scope list:** I edited `src/components/team-live.tsx`, `src/components/team-desk-people.tsx` and `src/components/company-access/new-employee-form.tsx` as components of the employees pages. Desktop Team's chip and the email field live there. Check for merge conflicts.
- **Home tile at 320–375px:** "Not clocked in" nearly fills a phone tile, so I dropped that tile's amber dot. The b-kit owner could allow a wrapping label to bring it back.
- **Mixed case on Home:** with both running and ended shifts, the tile shows only the running count; the missed ones show in the row below and in the aria label.
- **Setup card position:** phone and tablet put it first; desktop puts it at the top of the right column (existing grid rule in `owner-b-desktop.css`). True full-width top needs a CSS change there.
- **Team search at 390:** confirm the magnifier button has no background and the field layout is unchanged, including offline. I added one `@layer nv-b` rule for the offline case.
- **Person page:** check the sub under the name on phone (it may be hidden there; the Access row carries the same status) and the new Hours card under the Direction B page styles.
- **Decline text button:** check it at 390 and 1440, and the pending state.
- **Old words still outside my scope:** `whos-working-corp.tsx:19` ("N min late"), `manager-weekly-roster.tsx:132`, `premium-home.tsx:215` ("is late"), and the hidden corporate Home in `owner-home-corp.tsx:150` ("Missed" for both states).
- **Anchors:** Home links to `/app/inbox#todo-not-clocked-in` and `#todo-missed`, following the existing convention. Those ids sit on the corporate markup, so they likely do not scroll under Direction B, as before.
- **Edit employee** still shows "Email (optional)" with no helper (`employee-core-profile-form.tsx:69`); the finding named only Add employee.
