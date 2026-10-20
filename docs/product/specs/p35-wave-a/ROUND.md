# Wave A: round 2 (exit round)

**Update, October 20 (Jose asked for 1–3):** this branch is `origin/codex/verify-preview-33` (`0a2ea1b`, fast-forward) plus Codex's own candidate fixes, cherry-picked unchanged from `codex/release-candidate` so they reach the release target: **AL-WA-10** (`0caadb35`, Review replacement content wrapper), **TC-WA-3** (`08159520`, `0f0cd372`, separators kept with the preceding time), **TC-WA-17** (`4cadf00f`, unconfirmed-copy guidance matches the available recovery). Plus one Wave A commit for the rest of the TC-WA-3 family: no "·" can start a line on swap options, copy-receipt rows, availability "Updated", shift-request card titles or the member band. Tests (324), typecheck and lint pass. Browser proof is Codex's (not run locally, by Jose's choice, to avoid duplicating the gate).

**Update on the combined build (October 19, evening):** this branch is now `origin/codex/verify-preview-33` (`cd764f6`, merged as a fast-forward) plus Wave A fixes for the items Codex's crosswalk still lists for Wave A:
- **IS-WA-12 (Wave A part):** the "Optional" marker is hidden from the accessible name in `Field` (`wave-a/parts.tsx`) and on More details (`reviewed-callout-form.tsx`), as in Codex's prepared patch. The shared `select-field.tsx` part of that patch (aria-labelledby from the label words, so the hint isn't in a select's name) is the coordinator's file and has been sent to the coordinator.
- **IS-P4-11:** the time-off review's Back to Inbox keeps the Inbox's selected item (`?item=TIME_OFF:<id>`), validated as an item id; anything else is dropped. Covered by a new test. The Inbox side (passing `item` in its link to the review) is the Inbox owner's.
- **ST-WA-1 Coverage subcase:** already present on the candidate (`schedule/coverage/loading.tsx`); nothing to apply.

**Update after Codex's interim round-2 report and the first combined candidate (October 19, about 3 PM):** fixed at the head of this branch:
- **ST-WA-7:** while sending, the pressed button keeps the height it had (a two-line label at 200% no longer shrinks to one line and pulls the page up 36px). `src/components/wave-a/pending-button.tsx`.
- **Combined build TypeScript error:** the coordinator's kit no longer exports `useHoldHeight`; Team availability now uses the kit's `HoldHeight` component (present on both this branch and the candidate). `src/components/availability-team-list.tsx`. This also unblocks the candidate's browser checks (Availability compiled with a 500).
- **Coverage test conflict with the backend (`release/merge-1-wave-a/conflicts`):** take Wave A's side of `src/app/app/schedule/coverage/page.test.tsx`. With Codex C2 the targets carry `count`, so the page shows "barista: 1 more needed" and "1 more person needed" whatever the server's sentence; the label fallback now also reads the backend's new "N needed" wording.

Please re-check ST-WA-7 and continue the exit sweep on the head.

**Update after Codex's report on `7679133` (19:24 UTC):** **ST-WA-8** fixed: Delete this shift, and every other Wave A button that changes its words while sending without being a `PendingButton` (Time off Decline/Approve, Clocker PIN Save/Reset), now keeps its height while pending (`src/components/wave-a/keep-height.ts`: the height is taken at submit, at the current text size, and released when sending ends). Verified locally: Delete this shift at 320/200% stays 88px while "Deleting…" shows; document height and scroll unchanged; one POST. Please re-check ST-WA-8 on the head.

**Update after Codex's early exit checks on `7651490` (19:56 UTC):** **ST-WA-9** and **ST-WA-10** fixed. Every Wave A submit button now holds its layout size (`offsetWidth`/`offsetHeight`, which ignore the .98 press scale) for both height and width while its words change, in `PendingButton` and `keep-height.ts`. Verified locally with a 200ms held mouse press: Save scheduling profile at 1440/100% stays 219.72×52 at x962; Send swap request at 1440 stays 187.23×52 at x1015; Delete this shift and Send swap request at 320/200% stay 88px. One POST each, held and aborted.

**Update after Codex's report on `7f75dc4` (ST-WA-7 to 10 pass):** **ST-WA-11** fixed. The width hold is now `min(<width>px, 100%)`, so a rotation or resize while sending can't push the button out of its card. Verified locally: Delete this shift pending at 844×390, then rotated to 320×844, stays 248px wide inside its card (right edge 284 against the card's 304) at 100% and 200%, still reading "Deleting…"; Send swap request at 200% stays 288px within the 320 viewport. One POST each, held and aborted.


- **Round:** 2. Round 1 was run locally by five inspectors; its reports are in `inspection/` (alignment, stability, type-colour-copy, interaction-states, widths-roles). Every round-1 finding is fixed.
- **Commit:** the head of `claude/p35-wave-a-1283c8`. Pushed first at `2859ac4`; the head adds the swap and "Unable to work" sent states (below). Inspect the head.
- **Exit round:** **yes.** Please run the full sweep by all five areas (the matrix in `INSPECTION-BRIEF.md`), plus the re-checks below. The fixes touched every Wave A page, so a re-check-only round would cover almost everything anyway.
- **Brief for Wave A specifics:** `inspection/BRIEF.md` (pages, states, accounts, what's not Wave A's). `CODEX.md` lists what's set aside.

## Routes and roles

| Page | Route | Roles |
|---|---|---|
| Add shift | `/app/schedule/new` (also from a coverage choice: `?week=…&date=…&employeeId=AUDIT-LONG&locationId=…&start=…&end=…`) | Owner `QAOWNER`, Manager `AUDIT-M` |
| Review replacement | `/app/schedule/new?review=…` (from a Coverage candidate, when one exists) | Owner, Manager |
| Edit shift | `/app/schedule/edit?shiftId=audit-shift-0-1`, `?shiftId=audit-shift-0-2`, `&error=SHIFT_OVERLAP` | Owner, Manager |
| Coverage | the first `coverage?` link on `/app/inbox` | Owner, Manager |
| Copy-week receipt | `/app/schedule/copy-receipt?operation=11111111-1111-4111-8111-111111111111`, `?operation=bad` | Owner, Manager (Employee and Lead are redirected) |
| Time off (list) | `/app/requests?tab=pending`, `?tab=approved`, `?tab=declined` (the single-request review is at zero already; confirm only that it still works) | Owner, Manager |
| Shift requests | `/app/exchange?tab=pending`, `?tab=coverage`, `?tab=activity` | Owner, Manager |
| Team availability | `/app/availability`, `?week=2026-10-26`, `?week=2026-99-99` | Owner, Manager |
| Team member | `/app/employees/AUDIT-E`, `/app/employees/AUDIT-LONG` (Details and Scheduling), `/app/employees/QAOWNER` as Manager | Owner, Manager |
| New employee | `/app/employees/new`, `?error=save` | Owner, Manager |
| Clocker PIN | `/app/employees/AUDIT-E/clocker-pin`, `/app/employees/QAOWNER/clocker-pin` as Manager | Owner, Manager |
| Swap a shift | `/app/exchange/swap?sourceShiftId=audit-shift-0-1` (AUDIT-E), `?sourceShiftId=audit-next-0-1` (AUDIT-E; the "choose" state once the coordinator's seed gives AUDIT-E and AUDIT-SWAP reviewed rules and availability), `?sourceShiftId=x-audit-next-AUDIT-LEAD-2` (AUDIT-LEAD) | Employee `AUDIT-E`, Lead `AUDIT-LEAD` |
| Unable to work | `/app/exchange/callout?shiftId=audit-shift-1-1` (AUDIT-E), `?shiftId=x-audit-next-AUDIT-LEAD-3` (AUDIT-LEAD), `&error=details` | Employee, Lead |

Submissions: only with every POST held and then aborted in the browser. Count POSTs on a double tap (must be exactly one).

## Finding IDs to re-check (all fixed in the worktree)

- **Alignment:** AL-WA-1, AL-WA-2 (two-column layouts now switch by the content's width in rem: one column under 64rem), AL-WA-3 (week counts stack under 30rem), AL-WA-4 (Details/Scheduling switch), AL-WA-5, AL-WA-6, AL-WA-7 (checkbox, radio and notice icon centred on the first line at every text size), AL-WA-8 (720px of card in the reading column), AL-WA-9 (decision cards in a row share a height). Also re-measure label-to-field and help gaps: the field markup changed (help now sits outside the label).
- **Stability:** ST-WA-1 (each Wave A page has its own placeholder with its band per width: 320, 390, 844×390), ST-WA-3 (Team availability list holds its height while filtered). Double tap (one POST) on Add shift, Time off Approve/Decline, Unable to work, Delete shift. ST-WA-2, 4, 5, 6 are shared and fixed by the coordinator in `62cd033`/`aae87e4` on `claude/premium-phase-1`; they are not on this branch until tonight's merge.
- **Type, colour and copy:** TC-WA-1 to TC-WA-14.
- **Interaction and states:** IS-WA-1 (failed Approve/Decline/Delete stay on the page with a notice), IS-WA-2 (the result line is scrolled into view and focused), IS-WA-3 and IS-WA-12 (help outside the label: clean inline errors, no doubled names), IS-WA-4 and IS-WA-10 (Wave A error pages), IS-WA-5 (placeholders), IS-WA-6, IS-WA-7 (chips), IS-WA-8 (link names), IS-WA-9 (receipt is Owner/Manager only), IS-WA-11 (offline notice beside form actions).
- **Widths and roles:** WR-WA-1 (field pairs side by side only when each field gets 14rem, or 9rem for times and PINs), WR-WA-2 (availability status pills wrap), WR-WA-3 (long select values end with an ellipsis).

## What the fixes touched

- `src/app/app/premium-wave-a.css` (layout by container width, field and notice alignment, chips, placeholders per width, field pairs, inline error style, names unclamped).
- `src/components/wave-a/*`: `parts.tsx` (Field markup, FieldPair short variant, offline notice in FormActions), `pending-button.tsx` (result focus, single submit), `action-form.tsx` (new), `single-submit.ts` (new), `route-error.tsx` (new), `offline-notice.tsx` (new), `keep-duration.ts` (new), `shift-block.tsx`.
- Pages and components: `manager-time-off.tsx`, `manager-shift-requests.tsx`, `manager-availability.tsx`, `availability-team-list.tsx`, `coverage-assistant.tsx`, `coverage-review-content.tsx`, `create-shift-form.tsx`, `schedule/{new,edit,coverage,copy-receipt}/*`, `employees/[employeeId]/*`, `employees/new/*`, `employee-scheduling-fields.tsx`, `reviewed-callout-form.tsx`, `reviewed-swap-form.tsx`, `swap-shift-summary.tsx`, `swap-page-content.tsx`, `clocker-pin-form.tsx`, and new `loading.tsx`/`error.tsx` in each Wave A segment.
- Codex C1–C3 are read when present (decided-by line on the Time-off records, need counts on Coverage, described rows on the copy receipt); each falls back to today's behaviour.

## Added after the first push

- **Swap: choose, compare, send now have data.** The coordinator's seed gives AUDIT-E and AUDIT-SWAP reviewed rules and availability: as AUDIT-E, `/app/exchange/swap?sourceShiftId=audit-next-0-1` (or `audit-next-1-1`) shows two shifts (Riley Rivera, Sat and Sun). Checked locally: Send disabled until a choice, one POST on a double tap, "Sending…", a blocked send shows "Outcome uncertain…" with "Check & retry same request", focused.
- **Sent states.** After a real send, the server stops offering that shift and refreshes the page; the page used to flip to "No shifts to swap" and lose the result. Swap and Unable to work now keep a steady sent page ("Swap request sent" / "Report sent", a focused notice, the shift(s), and the link to follow it). Real sends on local data are fine to test; cancel them afterwards from `/app/exchange?tab=requests` as AUDIT-E so the next check has targets again.

## Known, not Wave A's (don't file)

Everything in `inspection/BRIEF.md` "Already known, outside Wave A", the shared shell, and the coordinator's shared fixes listed above that arrive at the merge.
