# Phase 1 — Manager workflow cleanup

## Scope and checkpoint

User-authorized isolated branch: `codex/fuel-phase-1-manager-workflows`.
Worktree: `/Users/josek0514/.codex/worktrees/fuel-phase-1-manager-workflows/Fuel-Scheduler-`.
Exact parent: `08e6386d5898683a1590f2ebbe1f9c6586931193`.

One local commit is authorized, with message `feat: align manager workflows with role boundaries`. No push, merge, deployment, migration, Phase 2, real authentication or customer-data operation is included. Existing dirty checkouts and Phase 0 remain intact.

The Phase 0 UI contract and repository Fuel UI skill apply. New Manager surfaces reuse their existing page headers, panels, tabs, statuses, action variants, typography and spacing. Scoped CSS retains 44px/22px action capsules, equal approval widths, balanced three-column tabs, neutral time-window pills and native focus.

## Implementation

1. Route Manager/Owner requests before loading personal data. Preserve Employee/Lead rendering, fields, actions and destinations.
2. Time Off: Pending, Approved and Declined. Display employee, dates, full/partial day, optional reason and informational status. Only pending requests expose the existing Decline/Approve forms. Preserve legacy `tab=team` review redirects by defaulting management to Pending.
3. Availability: review the requested week, or the upcoming collection week/current week. Show deadline, missing count, employee primary location, submission state, intentionally unavailable weeks and submitted windows. Seeded windows never count as a submission. Sort missing first. Invalid management week falls back with an explicit notice. No employee editor or mutation controls.
4. Shift Requests: Pending reads only management-review exchanges and call-outs; Open Coverage uses the existing unclaimed published-shift query; Team Activity combines closed exchange/call-out outcomes. Add an optional closed-status filter before the exchange history limit, preserving the existing default reader. Show both shifts/participants for swaps and reasons for call-outs; use current approval actions without automation.
5. Dashboard: add compact linked Time Off, combined Shift Requests and missing Availability counts inside the existing Pending Approvals card. Display the full pending total, while keeping its six-row preview and existing surrounding sections.

## Authorization and regression evidence

Existing `requireSelfService` and `requireRoles` implementations and all mutation guards are unchanged. New Manager review components call the existing Manager/Owner guard before team reads. Existing tests deny Owner/Manager personal availability, weekly availability, acknowledgement, offer/claim/swap/respond/cancel, call-out and Time Off submission. They deny Employee/Lead approval actions and exercise valid self-service Time Off. New tests deny Employee/Lead direct management review and coverage routes before data reads, distinguish seeded/missing/unavailable availability, select management histories, and verify complete Dashboard counts beyond six rows.

The history regression test was run with the completed-status filter removed: it failed; restoring the filter passed. No assertions were weakened or snapshots updated.

## Verification

- `npm run lint`: passed.
- `npm run typecheck`: passed, including after restoring only Next-generated `next-env.d.ts` / `tsconfig.json` edits.
- `npm test`: 28 files / 130 tests passed.
- `npm run build`: passed; scripts inspected, no migration step and no database credentials copied.
- Chromium and WebKit: 630 Manager view/normal/long/empty/error/success fixture cases, plus 70 deadline-open/closed/unset, invalid-week, selected-request/long-reason and bottom-navigation clearance cases. Widths: 320, 375, 390, 430, 768, 1024, 1440. No document overflow, action overlap, clipped row labels or unequal approval/tab tracks. Existing Dashboard tab scrolling is intentional and preserved.
- Protected comparisons: 198 Employee/Lead, Clocker and untouched Manager screen cases at 320/768/1440, with identical markup, rectangles and all computed styles; plus eight identical Clocker comparisons at 1024×768 / 768×1024 for both locations/browsers. The final Manager Availability-only status font normalization cannot match these protected screens and its own seven-width audit was rerun.
- 14 browser interaction checks: Employee validation, full/partial-day values and stable pending size; availability toggle/reset/save and stable pending size; swap keyboard selection/submit; Employee request/claim/cancel payloads; Manager Time Off/exchange/call-out approval payloads; keyboard/focus and native More disclosures. Existing self-service forms/actions are unchanged.
- Active control contrast: 18 browser/control cases × normal/hover/pressed/focus = 72 states; all ≥4.5:1. Approval, tab, Dashboard review and availability-week controls use existing pairings.
- Auth/session and all mutation guard sources, Employee Home/Schedule/My Time, Clocker source, time-clock data, scheduling engine, schema/migrations and notification sources have no diff from the base.
- Next-generated config/declaration changes were restored individually; final typecheck and diff whitespace check passed. No unrelated files included.

## Review evidence and limitations

Artifacts: `/Users/josek0514/.codex/visualizations/2026/10/02/01a0f8c7-f196-7d22-8896-8d3c96547bd9/fuel-phase-1-manager-workflows/`.
Baseline preview: `http://127.0.0.1:4192/app` (exact Phase 0 source).
Current preview: `http://127.0.0.1:4191/review.html`.

Eight pre-edit Manager captures, before/after browser scripts, result JSON and eight final screenshots are kept outside Git. Fixtures render real pages/components with fictional employees/shifts and intercepted actions; Manager Dashboard uses the actual server aggregation. Fixture query flags do not belong to the application API. Browser payload checks prove UI wiring, not live persistence. Unit tests prove guard behavior with mocked sessions/data, not deployed authentication. No authenticated/database end-to-end test or real device test is claimed.

Manager navigation retains its approved five direct mobile destinations. Existing Manager Schedule More and Employee/Lead More are checked; no new Manager navigation pattern is introduced.

## Changed files

- `src/app/app/availability/page.tsx`
- `src/app/app/exchange/page.tsx`
- `src/app/app/requests/page.tsx`
- `src/app/globals.css`
- `src/components/manager-availability.tsx`
- `src/components/manager-dashboard.tsx`
- `src/components/manager-dashboard.test.tsx`
- `src/components/manager-shift-requests.tsx`
- `src/components/manager-time-off.tsx`
- `src/components/manager-workflows.test.tsx`
- `src/lib/data/exchanges.ts`
- `src/lib/data/exchanges-history.test.ts`
- `docs/superpowers/plans/2026-10-02-fuel-phase-1-manager-workflows.md`

Stop for Jose's visual review after the single local checkpoint. Phase 2 is not started.
