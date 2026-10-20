# Measured Phase 3 remainders — external proposals

These patches are prepared for Claude's review, **not applied or certified**. Base: `a21650de50374683d52e32b883d7f419d7344f22`. The edited files are byte-identical to the frozen measured source `cd764f614be8ca5b5215be19d46e07cf968638d7`. All four patches pass `git apply --check` against the clean frozen worktree. No app files, tests, preview or source branch were changed. The full frozen exit review remains in progress.

## TC-P3-09 — Availability dates

`TC-P3-09-availability-date-atoms.patch` changes only the specific-week card's `formatWeekRange` and `formatBusinessDateTime` calls to use the already-imported `keepWhole`. The band already uses the helper. This leaves actual dates, business time zone, type roles, text scaling and wording intact; the helper protects month/day and clock/AM-PM tokens while a range may wrap after its dash.

Evidence on the unchanged checker page:

- `../core/passive-geometry/cells/72d6196951ff88173583.json`: AUDIT-E, Chromium320/200, Last updated `Oct` at y1426.515625 and `19` at y1466.515625: **40px line change**.
- `../core/passive-geometry/cells/851ad61a40d842ef6790.json`: same route320/150, week-context `Nov` at y487.515625 and `1` at y532.515625: **45px line change**.
- Historical scope: `docs/product/specs/premium-phase-3/inspection/type-colour-copy.md:1192` names both exact remainders. This does not claim closure of every other TC-P3-09 surface or the separate Home TC-P3-32 regression.

Recheck after application: both token ranges at320/150 and320/200, plus390/200 and landscape, in Chromium and WebKit; preserve allowed range wrapping after its dash and actual business-timezone values. No new implementation-mirroring unit test is proposed for two display wrappers.

## TC-P3-34 — Notifications title

`TC-P3-34-notifications-title-break.patch` addresses only the measured title. It adds an explicit discretionary soft hyphen at `Notifi\u00adcations` in a visual span and keeps the ordinary accessible heading `Notifications` in the existing kit's visually hidden text pattern. When the full word fits, the soft hyphen does not render; when it must wrap, a visible typographic hyphen supplies an intentional break. The visual span is hidden from accessibility so the heading keeps one ordinary accessible name.

The patch keeps the actual kit `title-1` font, its **full200% size**, line height, letter spacing, route title and navigation wording. It changes no CSS, shared kit API or font-size cap. Existing `portal-premium.css:2027–2032` already enables automatic hyphenation at150/200, and the current title still fragments; merely adding `hyphens:auto` again would not address that evidence. The app already uses explicit soft-hyphen breakpoints for the long acknowledgement label in `communication-detail.tsx`.

Evidence: `../core/passive-geometry/cells/112274885136645ebdcb.json` and its reviewed top crop, AUDIT-E Chromium320/200. The current **60px/72px** title reads `Notificatio` / `ns`, at y88.515625 /160.515625, with no visible hyphen. Historical TC-P3-34: `type-colour-copy.md:1214` explicitly allows proper hyphenation. The older TC-P3-34 footer-grid proposal does not reach this heading.

Recheck after application: visual wrap in both engines at320/200, exact accessible `h1` name `Notifications`, one heading announcement and axe; no visible soft hyphen when the word fits at320/100,390/100 or wide layouts; preserve the full kit font scaling and the loading-to-ready band height. No closure or runtime result is claimed by this proposal.

## TC-B-25 — newly measured My pay affected surface

`TC-B-25-my-pay-date-atoms.patch` applies existing `keepWhole` to the four actual date-render calls in `payroll/my-pay.tsx`: newest payday, newest period, earlier period and earlier payday. It changes no formatters, period boundaries, payroll facts, time zone, type role, document links or personal-pay wording. The existing `PaydayMoment` test keeps its semantic wording/document/no-invented-amounts assertions, normalizes nonbreaking spaces for ordinary wording, and verifies protected month/day/range atoms. It remains compatible with either old or proposed weekday behavior. This is separate from the short-weekday regression.

New measured evidence, independently disposed from old Payroll-runs evidence:

- E320/200 `/app/my-pay`: `Sep 27` month starts y2327.109375 and day y2378.109375 (**51px**), `bef4dace1ce5790a41a5.json`.
- E390/200: y1941.609375 → y1992.609375 (**51px**), `ccdc8346604ef8e36d7d.json`.
- Cause: raw `formatDateRange` at `src/components/payroll/my-pay.tsx:32`, rather than the helper used by sibling Payroll views. Latest/earlier payday wrappers are the same displayed-date contract, not a change in payroll language.
- Wave B owner crosswalk: **TC-B-25**, with explicit newly measured My pay surface; WR-B-11 is the narrower weekday/date alias. Prior TC-B-25 run-date evidence does not prove this component fixed. Coordinator accepted this affected-surface crosswalk.

Root may run the existing `src/components/payroll/my-pay.test.tsx` after applying. Browser recheck needs actual published own statements with at least two statement periods: E and the genuine pay-populated Lead at320/390/landscape, all four text steps and both engines. Confirm every month/day and AM-PM token has one line top, period dash stays attached to its preceding date, permitted breaks occur between date atoms, every document link remains its original own document, and no horizontal clip/overflow appears. Preserve a targeted midpage crop of the earlier period. A Lead with no published statements is an independently measured empty state, not a substituted positive pass.

## TC-P3-32 — shared short-weekday regression, also TC-P3-09 My time

`TC-P3-32-shared-short-weekday-break.patch` removes only the shared helper's extra short-weekday-to-month nonbreaking-space rewrite. Month/day, clock/AM-PM, duration, separator and Safari punctuation transformations remain. `Mon, Oct 19` becomes `Mon, Oct\u00a019`, allowing a break after the weekday instead of emergency fragmentation inside the date. It changes no visible words, date values, time zone or type size. The existing helper tests update both short-weekday expectations (ordinary date/time and Safari normalization) and add the minimal short-date boundary case alongside the already-present long-date, range, duration and separator guards.

Evidence: Home `52f8931d41b37e0f4dbb.json` E320/200 has final day digit on its own line, **40px** below; My time `c6ac3b3fa7b5c0626485.json` E320/200 and `b6d7debd228f0d0f7774.json` E390/200 split the same day by **51px**. Home retains **TC-P3-32 P1** and My time the explicit historical **TC-P3-09** entry-date surface (`type-colour-copy.md:1192`). They share one cause and are not two independent new defects. The My pay raw-format omission above is a different cause.

Meaningful existing checks after application: `src/lib/keep-whole.test.ts` (three current behavior tests), `src/components/employee-home-reviewed.test.tsx`, `src/components/employee-home-clock.test.tsx`, `src/components/employee-time-panel.test.tsx`, and the My pay test if its wrapper proposal is also applied. Local explicit weekday joins in Payroll runs/backlog/settings are deliberately untouched; this proposal does not silently certify their WR-B-11 narrow-column behavior. Reviewer should assess that local historical contract independently.

Required source-bound browser ranges: exact Home To do/recent/pass date tokens and genuine own My time entry labels for E/Lead at320/390/landscape ×100/125/150/200 in both engines; preserve month/day and every numeric digit on one line while allowing the weekday/year to break at ordinary spaces. Include the source historical320/100 and Lead390/150 Home dates, current E320/200 Home and320/390/200 My time, plus actual date/time stamps and clock/AM-PM controls. For all users of shared `keepWhole`, inspect selected-date metadata in Schedule/Availability/Updates/Notifications and original WR-B-11 Payroll dates at320/200 and1440/100 in both engines. Record actual glyph ranges and crops, not just output strings. Unit tests cannot certify line breaking. No proposal is applied or browser-certified here.
