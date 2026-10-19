# Current measured findings — exact cd764f6

Review remains incomplete. This list is additive; no zero-exit claim.

## TC-P3-09 · P2 · open

At AUDIT-E, Chromium, 320×844, 200% text, `/app/availability?week=2026-10-26`, the visible Last updated value splits `Oct 19` between lines. Oct begins at x216/y1426.52; 19 begins at x36/y1466.52, a 40px line change. The raw unchanged checker passed this cell; the retained named finding is established by its passive same-page DOM range measurement.

Evidence: `core/passive-geometry/cells/72d6196951ff88173583.json`, observed 2026-10-19T23:03:54.556Z. `src/app/app/availability/page.tsx:167` still renders raw `formatBusinessDateTime` without `keepWhole`. The smallest proposed repair is to apply the existing formatter wrapper only to this reported date-time. No application changes made. A midpage screenshot will follow after the full baseline.

## TC-P3-34 · P2 · open

At AUDIT-E, Chromium, 320×844, 200% text, Notifications renders its title as `Notificatio` / `ns`, with60px type and72px line height. This is the exact retained title surface from source `inspection/type-colour-copy.md:1214`. Evidence: `core/passive-geometry/cells/112274885136645ebdcb.json` and the matching top crop, reviewed visually. Ordinary body words with visible automatic hyphens are excluded.

## Selected-control visibility concern · interactive proof pending

The Availability current section tab is offscreen after text reflow; the current Specific week pill is clipped. Crosswalk to historical AL-47, IS-3, IS-29 and WR-50 before assigning a final new ID. No independent duplicate defect is counted yet. Passive geometry and crop are retained under `72d6196951ff88173583`; a deliberate text-step/resize trace follows after baseline.

## TC-P3-32 · prior P1 · passive measured open

At AUDIT-E, Chromium, 320×844, 200% text, Home `Mon, Oct 19` leaves its final digit on the next line. The full first range begins x88/y2603.52 and is151px wide; a19px final-digit range begins x88/y2643.52. Five Home date ranges exhibit the same split. Evidence: `core/passive-geometry/cells/52f8931d41b37e0f4dbb.json`. The new short-weekday join in `keep-whole.ts` and the Home short-weekday formatter produce a chunk wider than the152px row. This is the retained numeric/word fragmentation criterion from TC-P3-32, not ordinary visible body hyphenation. A targeted midpage crop is still pending after baseline.

## AL-P3-13 · P2 · passive measured open

At AUDIT-E, Chromium, 390×844,100% text, Schedule confirmation copy starts at1900.58 and is102px tall, while the32px icon starts1935.58 and centers1951.58; its center is38.5px below the title first-line center. The grid is already40px and copyx88, so the old32px-column assumption is obsolete. At320/200 the icon starts202px below copy. Raw same-page geometry: `25b4834473aa221a9fcf.json` and `3d19dda1206ad289d9b2.json`. This retains the vertical/icon-size remainder of `alignment.md:879`. Midpage crop remains pending.
