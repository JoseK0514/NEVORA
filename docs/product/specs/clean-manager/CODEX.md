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
