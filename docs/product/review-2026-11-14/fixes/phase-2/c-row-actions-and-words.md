# Phase 2, package C: one primary action per screen, one vocabulary

Patch: `c.patch` (16 files, 51 lines added, 28 removed; diff of `c545bea5` to worktree HEAD, no `zz-scan`).
Shots: `c-shots/` (10 pictures). All captures: `scratchpad/p2c-shots/` (`b-*` before, `a-*` after).

## What changed

### Row buttons (look only; every handler, form action, name, value, disabled and busy state, accessible name and tab order is as it was)

| Screen | Who | Before | After | Size (1440 / 390), unchanged |
|---|---|---|---|---|
| Time off requests, Waiting (`/app/requests`) | Owner, Manager | 5 filled teal Approve, 5 filled grey Decline | 5 tinted Approve (or Review), 5 quiet text Decline; 0 filled | 96x40 / 133x44 |
| Shift requests, Waiting (`/app/exchange`) | Owner, Manager | 5 filled teal Approve, 5 filled grey Decline | 5 tinted, 5 quiet text; 0 filled | 127 and 138x40 / 133x44 |
| Shift requests, Open cover (`/app/exchange?tab=coverage`) | Owner, Manager | 4 filled grey Close request | 4 quiet text Close request | 119x40 / 274x44 |
| Time corrections (`/app/timecards/corrections`) | Owner | 4 filled teal Approve, 4 filled grey Decline | 4 tinted, 4 quiet text; 0 filled | 112x44 / 156x48 and 156x44 |
| Pick up and swap, Open shifts (`/app/exchange`) | Employee, Lead | 2 filled teal Pick up | 2 tinted Pick up | 96x36 |
| Schedule, open shifts list (`/app/schedule?view=open`) | Employee, Lead | filled teal Pick up per row | tinted Pick up per row | 96x36 |
| Requests, Swaps for you (`/app/requests/hub`) | Employee, Lead | filled teal Review | tinted Review | 96x36 |
| Updates, To confirm (`/app/updates`) | Employee, Lead | filled teal Acknowledge and filled grey Open per update | tinted Acknowledge, quiet text Open | 350x40 / 134x40 |

The Decline confirm step on Time off requests (Keep beside the red Decline) is not changed.

How: the legacy buttons keep their own class and gain `b-rowact b-rowact--go` or `b-rowact b-rowact--quiet`. Two rules in
`src/app/app/b-foundation.css` (inside `@layer nv-b`) give those the kit's tinted pill (`--b-teal-50` fill, `--b-teal` text) and the
quiet text button (`transparent`, `--b-ink2`), the one disabled pair, and the teal focus ring. Kit buttons on B screens
simply changed `kind="teal"` to `kind="ghost"`. One normal rule keeps Pick up at its own width now that it is the ghost pill.

Files: `time-off-waiting-list.tsx`, `manager-shift-requests.tsx`, `manager-time-corrections.tsx`,
`employee-mobile/requests.tsx` (+ test), `employee-b/schedule-b.tsx`, `employee-b/requests-b.tsx`, `employee-b/messages-b.tsx`,
`b-foundation.css`.

### Vocabulary

See "Wording changed". Files: `whos-working-corp.tsx` (+ test), `manager-weekly-roster.tsx`, `premium-home.tsx`,
`owner-home-corp.tsx` (constant import only, same word), `timecards.tsx`, `employee-time-corrections.tsx`.

## Audit table (signed-in app, 1440 and 390)

Method: a probe in the capture tool listed every visible link and button with a filled teal, filled grey, tinted or red
fill, per route and width. Owner and Manager before numbers are from that probe at `c545bea5`. Employee and Lead before
is from the before pictures plus the code (their before probe log was lost, see Checks). After numbers are from the probe
for all four roles.

| Screen | What was there | What I did |
|---|---|---|
| Owner, Manager: Time off requests | filled teal + filled grey on every row | fixed |
| Owner, Manager: Shift requests (Waiting, Open cover) | same; Close request filled grey per row | fixed |
| Owner: Time corrections | same, one card per request | fixed |
| Employee, Lead: Pick up and swap; Schedule open shifts | filled teal Pick up per row | fixed |
| Employee, Lead: Requests hub | filled teal Review on the swap row | fixed |
| Employee, Lead: Updates "To confirm" | filled teal Acknowledge + filled grey Open per update | fixed |
| Owner, Manager: Things to do | already tinted Approve and Find cover, text Decline (round 1) | none |
| Owner, Manager: Home | one filled teal Find cover on the first Things to do row | left, see For Jose |
| Employee, Lead: Home | one filled teal Review on the first required to-do (review F2, NV-078) | left, see For Jose |
| Employee, Lead: Schedule | one filled teal Confirm (confirm the week) | left: the page's one action |
| Time off request detail; swap response detail ("Your response") | Decline + filled Approve or Accept | left: a detail page, its one action |
| Owner: Payroll | one filled teal Prepare for the unpaid period | left: file is outside my scope, see Needed |
| Owner: Settings, Positions | Save position + Cancel inside each row's closed edit form | left: one form is open at a time |
| Owner: Clocker tablets, Schedule templates, Clocker recovery, Publish | one filled primary each | none |
| Owner, Manager: Timecards, Team, Person, Notifications, Updates, Insights, Locations, PINs, Photo review, Payroll history, Who's working; Employee, Lead: Time, Corrections, Requests list, Notifications, My requests tab | no filled row buttons | none |

No screen in the captured set shows two or more filled teal buttons after the change.

## Rules behind it

- DESIGN.MD "Inspection fixes (November 15, 2026)", Buttons: "Row actions use the tinted pill for Approve and Review and a
  quiet text button for Decline; a filled teal pill is the page's one primary."
- The look is the one round 1 drew on Things to do (`inbox-b.tsx` `Decide`: kit `ghost` and the quiet text Decline).
- CSS layering B8: the `!important` rules are inside `@layer nv-b` in `b-foundation.css`. They use six id steps because
  the older rule that fills Approve (`owner-b-desktop.css`, "Round 5 D6") is in the same layer with five.
  No new colour literals, no new media queries.
- Attendance words: `ATTENDANCE_WORDS` in `src/lib/action-center/present.ts` and `notClockedInText` in `team-live.tsx`.

## Checks run

- `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .`: no errors in `src`. The only errors are in the capture
  tool's own `zz-scan/states.ts` (not in the patch, present before my work).
- `npx eslint <the 15 changed ts/tsx files>`: clean.
- `npx vitest run --dir src src/app src/components`: 300 files, 3107 tests, all pass (run after the last source edit).
- `npx vitest run src/lib/action-center src/test/phosphor-icon-weight.test.ts src/app/b-tokens.test.ts`: 223 pass.
- Not run: the whole `src/test` folder (so the known `manual-publication` failure was not exercised), integration tests.
- Browser, real app, fictional local data, 1440 and 390:
  Owner 14 routes + 4 + 10 more, Manager 14, Employee 15, Lead 15. `overflow` is 0 on every route and width.
- Focus: the probe pressed Tab, then focused the first restyled button of each kind on each page. `:focus-visible` matched
  and the ring was `2px solid rgb(11,110,105)` on Decline, Approve, Close request, Pick up, Review, Open and Acknowledge
  at both widths (one miss: Approve on Owner Shift requests at 390 in one run; it matched on Manager and at 1440).
  Pictures: `p2c-shots/a-*/**-focus-*.png`.
- Touch size: on 390 the row buttons are 44px tall (Time off, Shift requests, corrections) or 36 to 40px drawn with the
  kit's 44px hit area (Pick up, Review, Open, Acknowledge), the same as before.
- Console: the four-role run was made while other captures loaded the machine and logged `503` on Owner Things to do and
  Open cover (the page showed its "didn't load" card). The same failure is in my before run at `c545bea5`. A solo rerun
  of those routes loaded them with no console or page errors. `403` lines on Employee and Lead come from the Owner-only
  routes I asked for on purpose.
- Before probe for Employee and Lead: lost. I edited files while that capture was still running and the tool refused to
  write its log. The before pictures were saved; the after probe is complete.
- No Approve, Decline or other action button was pressed.

## Pages off the ladder or left alone, and why

Not a frame package. Left alone on purpose: the rows listed as "left" in the audit table, the Decline confirm step, all
dialogs and sheets, `loading` and `error` files, Payroll.
Phone and desktop sizes and positions of the restyled buttons are the same as before; only fill and text colour moved.
On the Time corrections phone layout Approve is 48px tall and Decline 44px. That was already so; I did not touch sizes.

## Wording changed

| Where | Old | New |
|---|---|---|
| Who's working, card heading and list name | Not in yet | Not clocked in |
| Who's working, row value | 24 min late / 1 h 5 min late | 24 min / 1 h 5 min |
| Schedule day list, live chip (`manager-weekly-roster.tsx`) | Missed clock-in | Missed |
| Schedule day list, live chip | 24 min late | Not clocked in · 24 min |
| Older Owner Home rows (`premium-home.tsx`) | Maria Rivera didn't clock in | Missed: Maria Rivera |
| Older Owner Home rows | Maria Rivera is late | Not clocked in: Maria Rivera |
| Older Owner Home rows | 3 people haven't clocked in | 3 not clocked in |
| Timecard detail, corrections list (`timecards.tsx`) | Awaiting review | Waiting |
| Employee corrections chip (`employee-time-corrections.tsx`) | Pending | Waiting |

`owner-home-corp.tsx` now reads "Missed" from the shared constant; the word is the same.
Not seen in a capture: the Schedule chip (the fictional late person's row sat under the phone tab bar in the picture) and
the `premium-home.tsx` rows (the current Home is the B screen; those rows are the older layout).

Stragglers found and not changed:

- "Missed clock-ins" as a group heading on Things to do, on Who's working and in the Home stat's spoken name. Round 1 kept it.
- "Correction awaiting review" (`timecards.tsx`, `payroll-review-copy.ts`): payroll review wording.
- "Proposed · awaiting approval / pending review" (`time-correction-context.tsx`), "Pending proposal" (`employee-time-corrections.tsx`).
- "Awaiting employee", "Manual review" (`exchange/page.tsx` status words; a test asserts them).
- "Awaiting setup" (`clocker-device-manager.tsx`, a tablet's state, not a request).
- "Pickup requested. Your assignment is awaiting review." and "…may still be awaiting consent or management review." (sentences).
- "Pending requests" (`mobile-home-overview.tsx`), "Pending, approved and declined" (`manager-inbox.tsx`): older layouts.
- "Rejected" for a declined correction in the timecard detail (others say "Declined").
- No "No show" or "Running late" anywhere in the signed-in app.

## For Jose to decide

1. Owner Home "Find cover" and Employee Home "Review" are filled teal on a list row, one per screen. I left them as the
   page's one action. On Things to do the same Find cover is tinted. Say the word and both become tinted (one word each).
2. "Close request" on Open cover is now plain text, alone at the right of its row. It follows the rule; it also looks
   less like a button. The tinted pill is the alternative.
3. Who's working shows "24 min" under "Not clocked in" (was "24 min late"). "Started 24 min ago", as on Things to do, is an option.
4. The stragglers above, mainly "Missed clock-ins" as a heading, "Awaiting employee" and "Rejected".

## Needed from another package

- `src/components/payroll/payroll-runs.tsx` and `src/app/app/payroll/page.tsx` (outside my scope): "Prepare" is a filled
  teal button on each unpaid period. With two or more unpaid periods the page shows several filled teal buttons, and a
  big "Prepare payroll" can sit above them. They should be the tinted pill (`kind="ghost"`, or add `b-rowact b-rowact--go`
  to the `c-btn` one). The fictional data has one unpaid period, so I saw one.
- `src/components/employee-b/requests.css` line 119 sets `align-self: flex-start` for `.eb-pickup .b-btn--teal`. Pick up
  is `b-btn--ghost` now; I added the matching line in `b-foundation.css`. The old line can go when that file is next open.
- `DESIGN.MD` is not in my scope. Its Buttons line already states the rule; a note that the `b-rowact` classes carry it
  on legacy buttons would help the next builder.

## For Codex

- `src/lib/data/employee-home.server.ts` line 148 returns "Shift request awaiting manager review" from the server. If
  Jose wants "waiting" there, it is a server string.
- Nothing else. No read, handler, route or data contract changed.

## Release note

Development is the working and acceptance release. This is a local patch on fictional data only: nothing committed to a
branch, pushed, merged or deployed. Source: worktree `wt/p2c`, base `c545bea5` (temporary detached commit).
