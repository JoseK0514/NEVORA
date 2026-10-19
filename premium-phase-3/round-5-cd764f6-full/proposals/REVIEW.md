# Two measured Phase 3 remainders — external proposals

These patches are prepared for Claude's review, **not applied or certified**. Base: `a21650de50374683d52e32b883d7f419d7344f22`. The edited files are byte-identical to the frozen measured source `cd764f614be8ca5b5215be19d46e07cf968638d7`. Both patches pass `git apply --check` against the clean frozen worktree. No app files, tests, preview or source branch were changed. The full frozen exit review remains in progress.

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
