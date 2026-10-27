# Employee mobile: Hours, timecards and corrections

Continue the approved teal Employee prototype. Scope is the fictional local mobile experience; the application/source checkout remains read-only at development46e2027. No production integration, migrations, credentials, real notifications or deployment.

## Connected mobile flow

- Hours separates Recorded time, Timecards and Corrections using the shared view selector.
- Recorded time keeps the approved Today status, current punches and original/effective completed-entry details.
- Timecards provides own period selection of1–31days, inclusive, with recorded gross time and breaks kept separate. Open intervals stop at the explicit sample observation time. Historical snapshots are read-only, with frozen observation time and raw/effective provenance.
- Corrections covers completed clock boundaries, existing closed breaks, missing entries and replacement of approved missing time. Review/edit/receipt and own decision history preserve original punches.
- Uncertain-result recovery retains the same proposal and identifier across in-app navigation; its read-only summary explains what will be retried. Partial/stale/finalized conditions never claim success or grant new authority.

## Source-backed boundaries

Employees inspect only their own time. Management timecard approval, finalization, reopening and export are excluded. Submitted time corrections cannot be cancelled or withdrawn by Employees; the legacy prototype action was removed. Cancelling an unsent form remains distinct from withdrawing a request. Missing breaks cannot be created through this surface, and active punches must be closed in the location Clocker before a correction is proposed.

Corrections require valid ordered dates/times, a reason up to500characters, no future end, no overlapping own entry/adjustment, retained breaks inside a changed entry and a changed break inside its effective parent. Approved adjustments change effective views; Pending/Declined proposals do not. The sole sample work location is the Employee's eligible Aguada location.

## Design and verification

Reuse Button, Field, native Select, ViewSwitcher, Row, Status and Receipt; keep Phosphor icons, shared spacing/radii and48/44px controls.21st search returned time-off, glass and timesheet-confirmation examples; their semantics/styles do not justify replacing the existing task primitives or inventing an Employee confirmation capability. No catalog code or hosted generation was used.

Check the existing114scenarios plus timecard/correction/row-reflow scenarios in Chromium, WebKit and Firefox; inspect normal and200% text, phone widths, focus and native dialog behavior. Independent review covers source permissions, arithmetic, immutable/current/proposed distinctions and the rendered flows. Record findings and remaining integration limits in hours-verification.md.
