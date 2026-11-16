# Phase 3, package B: Owner and Manager Schedule

Takeover of a stopped builder. Base `ed7f8b4c`, last temp commit `097b9007` in `wt/p3b`. Patch: `b.patch` (8 files, +351 / -44).
I read the earlier diff, kept most of it, fixed what was half done, and finished the rest.

## Findings

| Id | Status | What was done or found | Evidence |
|---|---|---|---|
| OW-006 (Schedule part) | fixed | The grid card's head is one line: "Covered this week", "Staffing 59%", a 160px bar (96px on a narrow card), "197 h of 336 h", then the legend. No tile, no "aren't required" sentence. Positions and Lead show only when required. Phone band unchanged. | `src/components/schedule-coverage-line.tsx`; `manager-weekly-roster.tsx` grid bar; `b-shots/owner-schedule-1440.png` |
| OW-027 | fixed | Every day in the Open shifts row is one chip ("4 open" and a caret). It opens that day's list under the row (time, place, Fill or "Not filled"). All seven days alike. Row is 56px. Amber dashed while a shift can still be filled, grey when all are over. "Show 1 unscheduled" is 14/600 at the row inset. | `b-shots/owner-schedule-open-1440.png` |
| OW-034 (Schedule part) | fixed | The week's state chip on Schedule is 22px, 0 8px, 12/16 600, tones from the -50 tokens. "Not filled" in the list uses the kit's `BChip`. | `owner-b-schedule.css` TB-018 block |
| OW-003 (Schedule part) | partly | Grid durations come from `durationRow` and `durationTotal`: "46 h 30", "448 h", never "446.5 h". Home and Schedule showed the same total in one session (448 h and 448 h). Figure columns are tabular. The open list writes "3:00 PM – 4:30 PM" like Home. Remains: the phone day list still writes "3–4:30 PM" (the kit's `compactRange`), while Home writes "3:00 PM – 4:30 PM". See "For Jose". | `manager-roster-presentation.ts` `assignedMinutes`; roster test "grid: whole-minute durations" |
| MG-017 | fixed | Wording as given in the finding. | `schedule-shift-form.tsx:189`; `b-shots/owner-edit-1440.png` |
| TB-003 | fixed, with two changes from the finding | Under 820px of card: no avatar, names on one line at 14/20 600, blocks 5px with a 12.5/16 time and a one-line 11.5/14 position, "Open shifts" on one line with the count as a pill. One row height at 900 and 768. Person column is 128px (finding said 124: "Gabriela Santos" needs 128). Row height is 68px (finding said 60: a long time such as "5:30p – 11:30p" breaks at its dash and needs it). | `b-shots/owner-schedule-900.png`, `owner-schedule-768.png`; measured rows `[68]` at 900 and 768 |
| TB-011 | fixed, as an in-place list | On tablets, and on any touch screen from 768px, the chip is 44px and fills its day. It opens a list with 44px Fill buttons. The list is a row under the Open shifts row, not a floating popover: nothing is covered, and Escape returns to the chip. | `b-shots/owner-schedule-open-900.png`, `manager-schedule-open-768.png` |
| TB-018 | fixed | "Published" sits 12px to the right of the week stepper on its line, at every width from 768. | `b-shots/owner-schedule-900.png` |
| Phase 2 leftover: Scheduling rules' open sections | fixed | No bullets. Name at the left and its fields at the right. Search field with its glass inside. One caret per disclosure. Forms on a two-column grid. A Manager's read-only policy is a label and value list. Phone and wide. | `b-shots/owner-rules-0-1440.png`, `owner-rules-1-1440.png`, `owner-rules-2-900.png`, `owner-rules-1-390.png`, `manager-rules-4-1440.png` |
| Phase 2 leftover: full-width Save bars | fixed on Scheduling rules | "Save staffing and hours", "Set deadline", "Add coverage period", "Save quantities" and the policy saves are as wide as their words from 768px. Phones keep full width. Add shift and Edit shift already had sized buttons. | `b-shots/owner-rules-1-1440.png` |
| Nov 14 RA-10 (hover-only "+ Add") | partly | The empty day's "+ Add" is now a real link named "Add a shift for Ana Colon, Mon Nov 9". It shows on keyboard focus and stays visible on touch screens (grey, 44px). Remains: arrow-key movement in the grid (UI backlog 4). | `b-shots/owner-add-focus-1440.png`; roster test |
| Nov 14 BR-11 (Schedule week arrows) | already fixed at 390 | The capture reports no small targets on Schedule at 390. At 320 it still lists "Previous week", "Next week" and "Fill". Not changed. | `p3b-work/h3/scan-log.json` |
| Extra: Week templates | fixed | The Name field is a plain field, not a shadowed card inside the card. | `b-shots/owner-templates-1440.png` |
| Extra: Build and publish | fixed (768 and wider) | The rows sit in the page's one card with hairlines. Two shadowed cards inside the card are gone. `owner-b-desktop.css:421` already meant this and lost the cascade. | `b-shots/owner-publish-1440.png` |

## What changed, by screen

- **Schedule, tablets and desktop** (`manager-weekly-roster.tsx`, `schedule-coverage-line.tsx`, `owner-b-schedule.css`): coverage line, week state beside the stepper, one open-shift chip per day with its list, narrow-card grid, whole-minute durations, focusable "+ Add".
- **Schedule, phone**: structure unchanged. The day card's total reads "12 shifts · 49 h 30" (was decimal hours).
- **Add shift, Edit shift** (`schedule-shift-form.tsx`): the lead helper line.
- **Scheduling rules** (CSS only): every open section, phone and wide.
- **Week templates, Build and publish** (CSS only): no cards inside cards.
- Server code, handlers, generation and publish logic: untouched. `assignedMinutes` is a new pure helper beside `assignedHours`.

## Open-shift chip, accessibility

- A `button` with `aria-expanded` and `aria-controls`. Enter and Space open it. Tab goes into the list. Escape closes it and returns focus to the chip. Checked by keyboard as Owner and Manager.
- Every open shift is reachable: opening the seven chips listed 29 shifts, and the row count says 29.
- Works without hover. Screen-reader text says the day, the count and how many are already over.
- State is not colour alone: the caret turns and the border goes solid.

## Wording changed

- "Owners and Managers can lead a shift" to "This person leads the shift. Owners, Managers and Leads can." (MG-017)
- Grid open row: "2 not filled" plus separate time chips to "5 open" on one chip. Screen-reader text: "5 open shifts, Sun Nov 15, 2 already over".
- New in the open list: "Sun, Nov 15", "5 open shifts", "Fill", "Not filled" (words already used on the phone list).
- Durations: "446.5 h" style to "447 h" (totals) and "46 h 30" (rows).
- New accessible name: "Add a shift for {name}, {day}".
- Grid coverage: the sentence "Positions and leads aren't required" is no longer shown in the grid card (finding OW-006). Home and the phone band keep theirs.

## Checks run

- `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .`: no errors in `src`.
- `npx eslint` on the 7 changed ts and tsx files: clean.
- `npx vitest run src/components/manager-weekly-roster.test.tsx src/app/app/schedule --testTimeout=30000`: 23 files, 274 tests passed. With the default 5 s timeout `schedule/edit/page.test.tsx` timed out twice while six builders loaded the machine, and passed with the longer timeout.
- `npx vitest run src/app/app/b-viewport.test.ts src/app/app/b-foundation.test.ts`: 59 passed.
- Full suite `npx vitest run --dir src src/app src/components src/lib`: 811 files passed, 1 failed, 24 skipped; 12271 tests passed, 2 failed, 741 skipped. The 2 failures are 5 s timeouts in `src/lib/tenancy/migrations/typed-guarded-backfill.server.test.ts` (server code this patch does not touch). Rerun alone with `--testTimeout=30000`: 68 of 68 passed. Log: `p3b-work/vitest-final.log`.
- Capture, Owner (`cap.sh ... owner 1440,1100,900,768,390,320`, Schedule, Add shift, Build and publish, Week templates, Scheduling rules, Home): overflow 0 on all 36. No page errors. Eight console lines "503 (Service Unavailable)" on Schedule, Add shift and Home; the Manager run had none and builder A's logs show the same line, so I read it as machine load, not this patch. Not proven.
- Capture, Manager (`cap.sh ... manager 1440,1100,900,768,390`, the five Schedule pages): overflow 0 on all 25, no small targets, no console or page errors.
- State pictures by a Playwright step in the held page (Owner and Manager): chip open at 1440, 1100, 900, 768; each rules section open at 1440, two at 900, 390, 320; publish with "Start from" open; next week; Edit shift at 1440, 900, 390.
- The Owner route pictures were taken one commit before the last CSS rule (the Manager's read-only policy list). That rule was then checked in a Manager run.

## For Codex

None. No finding here waits on a server field.

One note, no action asked: `src/app/app/schedule/page.tsx:278` still builds `hours.week` with `assignedHours` (decimal hours). It only feeds the hidden "over the maximum" text in the grid. I did not touch the page's data shaping.

## For Jose to decide

1. **Phone time ranges.** The Schedule phone list writes "3–4:30 PM" (the kit's compact form, also on Employee Home). Owner Home writes "3:00 PM – 4:30 PM", and OW-003 asks for that in rows. At 320px even the compact form wraps. I left the phone list alone. Pick one form for phone rows.
2. **MG-017 names Leads.** An older note in the tests said the Lead role was on hold and the line named Owners and Managers only. The team rules now list Lead as a role and the server message names all three, so I used the finding's words. Say so if Lead should stay unnamed.
3. **Tablet row height and column.** 68px rows and a 128px person column instead of the finding's 60 and 124. 60px needs every time on one line, which does not fit a 72px day at 768.
4. **Open list in place, not a popover** (TB-011). Say so if you want it floating.
5. **Past days' chips are grey**, today's and future ones amber dashed. The finding drew all of them amber.

## Needed from another package

- `b-kit.tsx` `compactRange`, if decision 1 goes to the full form everywhere.
- `employee-b-desktop.css` still carries `.cm-grid__coverage` rules that nothing renders now. Safe to remove by whoever owns that sheet.

## Not done

- At 1100px (card 900px, above the finding's 820 limit) a long time such as "4:30p – 11:30p" still wraps in today's column and makes that row 86px against 67. Same as before this phase.
- Arrow keys in the grid (RA-10, second half).

## Not verified

- No touch device. The `(pointer: coarse)` rules (44px chip from 768px, visible "+ Add") were not exercised: the capture browser has a fine pointer at these widths.
- No screen reader run. Roles, names and states were read from the DOM.
- Sparse workspace (`sparse`) and a Draft week were not captured. "Not set up" coverage and the amber "Draft" state chip are covered by unit markup only.
- Reduced motion: the caret's turn is inside `prefers-reduced-motion: no-preference`; the capture runs with reduced motion on, so the animated case was not seen.
- Employee pages: `ManagerWeeklyRoster` and `ScheduleShiftForm` are not shown to Employees, so no Employee page was captured.
