# Clean Manager and Owner app: notes for Codex

Branch `claude/clean-manager` (base: `origin/codex/verify-preview-33` at 6c56f504, plus the Wave A head cfbfd062).

## Count change (approved by Jose on October 19)

**Needs you now counts coverage gaps for today only.** Gaps on later days move from the urgent section to planning.
- Where: `isLaterCoverageGap` and `inboxSections` in `src/lib/action-center/inbox.ts`. `needsYou()` reads those sections, so
  Home, the Inbox title, the tab-bar and sidebar badge, and `GET /api/manager/inbox-count` (`src/lib/data/inbox-count.server.ts`)
  all change together. With the local fictional data the badge goes from 28 to 10.
- Nothing is dropped: later gaps are listed under Plan ahead. Past gaps keep their own section, as before.
- Test: `src/lib/action-center/needs-you.test.ts` ("counts coverage gaps for today only").
- No server read, route, SQL or contract shape changed. If you consider the server's URGENT priority authoritative for the
  badge, say so and the split can move into the presentation layer instead.

## Scope guard

Every visual change is scoped to Owner and Manager: `premium-clean-manager.css` applies only under the shell's
`data-nv-clean`, which `app-shell.tsx` sets only for those roles. Employee and Lead pages should be unchanged.

## Inspection

Please pause the exit sweeps on Manager and Owner pages (Wave A, Wave B, Desktop, and the Manager parts of Profile) until
this branch asks for its exit round; they are out of date. Phase 3, Wave C and Employee sweeps are unaffected.

## Contract request: live shift id on Today's shifts

The mockup's Inbox item (no clock-in) offers "Edit shift". `TodayShift.id` comes from `schedule_publication_revision_shifts`
(the published snapshot), so it can't open `/app/schedule/edit?shiftId=…`. If the Today read can also return the live shift's
id (for example `shiftId`), the Inbox will add that action. Until then it offers Open/Review timecard and View profile.

## From the 50-review inspection (Oct 21) — backend contracts and fixes for Codex

UI can't fix these; each is written up in `scratchpad/review50/reports/` (reviewer number in brackets).

1. **Profile read always fails** for Owner and Manager: `/api/management/profile` returns `read_failed`; the error is
   discarded at `management-profile.server.ts:41`. [10, 47]
2. **Sign-in and activation hardening**: no rate limit on login or activation; unknown IDs answer faster; a redirect
   reveals unclaimed IDs; employee ID + phone claims an account with no invite token or expiry. Wave C's
   `claude/auth-premium` reworks activation — coordinate there. [40, 41]
3. **Server logging and error references**: `src` has no logging; 43 routes return bare 503s. [45]
4. **Idempotent time-off decisions and versioned Publish/shift edits** (lost responses show "wasn't saved" after
   saving; "Publish anyway" overwrites unseen changes). [45]
5. **Scale caps**: the 500/1000-row caps blank Home and the Inbox at ~250 employees; the badge triggers full
   action-center rebuilds (~95 round trips per Home view); `time_entries` reads lack time bounds and indexes. [43, 44]
6. **Structured action items** (person, place, time, message key) instead of parseable English; location scope applied
   on every read (today only 4); server-computed Needs-you count. [43]
7. **Unplanned-location coverage**: a not-started location emits a 00:00–24:00 gap every day, inflating Schedule and
   Home counts (West Office). Either suppress for `not_started` or mark the gap all-day. The UI now renders such
   blocks as "All day". [48, 50]
8. **Payroll export**: period total includes breaks under one earnings code; split paid/unpaid and daily/weekly for
   overtime; mark recorded breaks paid or unpaid. Risks to confirm with counsel. [6, 7]
9. **Timecards Role column**: punch positions are empty for drafts; expose the employee's role (or scheduled
   position) in the timecards read. [12, 47]
10. **Acknowledgement counts** for manager Updates rows ("X of Y acknowledged"). [13]
11. **Schedule 500s**: a DB statement timeout fails the whole page render; degrade per-read. [48, 49]
12. **Push payloads**: 20 events all read "review your pending task"; say what happened (no pay data), EN/ES, and set
    the app badge. [8]
