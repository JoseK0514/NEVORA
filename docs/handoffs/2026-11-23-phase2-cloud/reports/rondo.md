# Rondo and Insights fixes (H1–H6), Nov 23, 2026

Branch `claude-codex-collab-nevora-rondo`, from `4a68adfc`. Rondo ran with no AI provider (advisor flags on, no provider,
model or key); fictional seeded data only; no deploys.

## Commits
- `f6a1bf93` Rondo and Insights: say shared facts once, one add action, even action rows
- `d6bc3987` Rondo and Insights: fewer repeated lines, rem text, 44px targets
- `d19e69ea` Christmas bonus and Insights: row name is its words, 44px phone segments
- The shots commit is the last commit (captures and this report only).

Checks: `tsc --noEmit` clean; oxlint clean on the changed paths; `node scripts/run-rstest.mjs src/components/owner-advisor
src/components/reports src/components/christmas-bonus src/app/app/reports` 320 passed, 0 failed (one test added: two
attention items share one title, one time line and one style of action; tests updated for "3 shifts" and "Add record").

Capture: one production build (`NEVORA_OWNED_APP_PRODUCTION=1`) of `d19e69ea`, Owner `QAOWNER` (standard seed) and
company-wide Manager `OWN-ELENA` (rich Owner seed), at 390, 768, 1440 and 390 with 200% root text. Shots:
`shots/rondo/<row>-<o|m>-<390|390t|768|1440>.webp`. Each width also ran axe on `main`, a document overflow check, a target
scan (controls under 44px) and the older-kit class count.

## Per page

**H1 Rondo AI, Owner** (`owner-advisor/attention.tsx`, `workflows.tsx`, `advisor.tsx`, `notebook-panel.tsx`, `advisor.css`)
- Before: each item repeated its day, "Observed 8:14 AM", the basis line and four mixed actions (one outlined, three
  text buttons). Two items titled "Review today's planning gaps" each had their own title. "Not relevant today" wrapped
  alone at 768. "Where are we short this week?" sat flush on its paragraph. The check buttons had uneven widths on phones.
- After: "Mon, Nov 23 · Observed 8:44 AM" is said once under "Today's staffing and recorded-punch issues." Items with the
  same title sit under one title, by place (West Office, Main Office), with their shared basis once. All four actions
  are the same tinted row button in an even grid: two by two in a narrow row, four across when the row is 44rem or
  wider. The weekly link has a 12px gap. The check buttons fill the phone width. The briefing's "Today on the floor"
  row no longer repeats the observed time.
- Removed explanatory lines: "Your briefing choices do not change schedules or time records.", "These checks work
  without an AI connection and do not save business changes.", "Goals and tasks stay saved for your Owner account…".
  "Closing a task records your choice…" and "N of 12 saved tasks…" show only when tasks exist, so "0 open" isn't
  restated.
- Overflow 0 at every width including 200% text; axe 0; no older-kit classes.

**H1 Rondo AI, Manager** (`manager/manager-rondo.tsx`, `manager-client.ts`)
- Before: "shifts published" on all seven day rows; two footnotes; band "Ask about the schedule at your locations".
- After: the section is "Published shifts and planned hours" and rows read "5 shifts", "39 h". Both footnotes are gone.
  The band reads "Ask about your schedule", which also covers Daniel, who has one location.
- Overflow 0, axe 0.

**H2 Weekly plan**: the band subtitle "Compare options for a week" is now "Staffing for one week", so the only button
("Compare options", solid teal) isn't repeated. Overflow 0, axe 0.

**H3 Business records**: the band's "Add record" button and the phone nav's "Add" are gone. Adding is the card's one
action: the empty card's solid "Add record", or the list's last row "Add record" once records exist. One wording.
Overflow 0, axe 0.

**H4 Company knowledge**: the band "Add document" button and the phone's 40px "Add" are gone; "Add document" is the
Documents card's last row. "0 of 20" shows only when there's at least one document. Overflow 0, axe 0.

**H5 Insights** (`reports-corp.css`): text sizes and line heights are in rem (31 values, identical at 100%). The fixed
48px and 52px rows grow with text. The period menu, Export and the phone's period segments went from 40px and 36px to
44px. Overflow 0 including 200% text. Not changed: see the proposed rows below.

**H6 Christmas bonus** (`christmas-bonus-report.tsx`, `b-thirty-day.css` line 60, `.c-bonus` only): the subtitle is
"All locations"; the bonus year is said once, in the menu ("Oct 2025 – Sep 2026"). The phone year menu is 44px. The
no-hire-date row's screen-reader name is now its visible text (it was a separate label; axe
label-content-name-mismatch). Axe 0.

Button styles across the pages: one solid teal main action per card (Compare options, Add record); tinted row buttons
for row actions; text links only in section heads (Check again, Refresh history). Left and right edges: cards align
with the band title at every width; no element runs past the right edge (overflow 0 everywhere).

## Impeccable audit
- **Hierarchy:** each fact once per card (day, time and basis lifted out of the items). One main action per card. The
  Owner page is still long on phones (about 4,000px) because the conversation and notebook follow.
- **Spacing and alignment:** action grids use 8px gaps and 12px above. On phones, sub-items under a grouped title start
  at the card's inner edge, like the actions did before, while the group title stays beside its glyph.
- **Accessibility:** targets on the changed controls are 44px or more. Rem text holds at 200% with no overflow. Visible
  text and accessible names match on the changed rows. Focus rings come from the kit's `.b-rowact:focus-visible`
  (2px teal), unchanged.
- **States:** empty (Business, Knowledge, notebook), loading and failure paths are unchanged. Captures show the ready and
  empty states only.

## Blocking items left
None of items 9–14.

## End-sweep items as proposed ledger rows (kit or app shell, not mine to change)
1. Kit `CorpTitle` / `CorpNav` back link ("More", "Rondo AI", "Insights") is 32px tall at 768 and 1440 on every page
   here. Proposed: 44px hit area in `src/components/corp/*`. End sweep.
2. H5 Insights: axe `color-contrast` 1.08:1 on `.c-ins__range` at 768 and 1440. It's a false positive: the line is
   lifted into the teal band and reads white on teal; axe measures it against the canvas. Proposed: mark the band's
   lifted line so axe sees its band background (kit band). End sweep.
3. H5 Insights: two older-kit wrapper classes stay in the body, `wb-page wb-reports` and `wb-insights` (three at 768 and
   1440 with the `nv-sr` "Report period:" label). `premium-wave-b.css` print and layout rules still hang on them, and
   that sheet is shared. Proposed: move the print rules onto `c-ins` and drop the `wb-` classes. End sweep.
4. H5 Insights: worked and under-plan are rounded separately ("24 h 57 min of 61 h planned" next to "36 h 2 min under
   plan"). It's a number rule in `reports.tsx`/`lib/reports`, not a UI change. Not changed. End sweep.
5. H2 Weekly plan: the radio circles are 22×22. Each sits inside a full-width labelled row of 44px or more, so the
   target passes. Logged for completeness only.
6. H6: the exact bonus-year dates (Oct 1, 2025–Sep 30, 2026) no longer show on wide screens; the menu shows the months.
   If Jose wants the exact days back, they belong in the "Dates for this bonus year" card, not the band.

## Gaps
- Location Manager Daniel (`OWN-DANI`) wasn't captured. His Rondo is the same component, and the band wording change
  covers his one-location case.
- No keyboard walk recorded beyond the kit's focus styles. No reduced-motion pass (none of these changes animate).
- The Owner capture uses the standard seed and the Manager capture uses the rich seed, so the data differs between
  roles.

## Follow-up from the lead (commit `31f06892`, after merging `origin/claude-codex-collab-nevora`)
- **H6:** on wide screens the subtitle is the bonus year's exact dates again ("Oct 1, 2025–Sep 30, 2026 · All
  locations"), and the band menu reads "Bonus year", so the dates appear once. On the phone there's no subtitle, so the
  menu itself shows the exact dates. Its screen-reader name keeps the visible words. The "Informational only" text is
  unchanged. Axe 0 and overflow 0 at every width, including 200% text.
- **H1 Owner:** in a group of places, "Includes draft commitments; verify published staffing separately." and the
  shared "Review source" link (both places open the same week's schedule) now appear once under the group title. Each
  place keeps Track this issue, Later · 1 hour and Not relevant today: these are three across with room, or two plus one
  full-width when narrow. These three can't be merged into one set without new behaviour: each saves that place's own
  issue record with its own revision, and the controller sends one save at a time (a second save cancels the first).
  Axe 0 and overflow 0.
- Re-captured H1 and H6 (Owner) on `31f06892` at 390, 768, 1440 and 390 with 200% text, plus phone shots at viewport
  height (`H1-o-390-fold.webp`, `H6-o-390-fold.webp`). H6 is the same screen for the company-wide Manager. The H1
  Manager screen didn't change.

## Second follow-up: 200% text (code `addbd028`, `c59a8d5c`, after merge `f0acc3b9`)
- Kit labels on these pages are now in rem at their current sizes, so they match at 100%. This covers section labels,
  stat labels and figures, field labels and help, buttons, empty rows and row values. They live in each page's sheet
  inside `@layer nv-b` (`advisor.css`, `weekly.css`, `knowledge.css`, `business.css`, `reports-corp.css`). At 200% the
  probe finds no fixed-px text left on H1–H4 or H6. Stat labels wrap instead of cutting off.
- H5: the period segments wrap to a second row at large text, so the selected pill no longer becomes a tall circle. The
  period line wraps instead of being cut off. Two small kit sizes stay fixed: the Insights pill "… under plan" (12px,
  `CorpPill`) and the segment label (20px at 200%).
- H6: the phone bonus-year menu wraps inside the page. At 390 with 200% text the page is now 390px wide (it was 402px).
- H1 Owner: "shortfall: 1." keeps the figure on its line (no-break space added in `attentionDetail`).
- H2: the week field keeps "·" with "This week". On H1 Manager the kit's segment dot already sits with "This week".
- Not fixed, kit: at 200% the phone band titles ("Weekly plan", "Rondo AI") stay about 26px while body text doubles.
  That comes from the shared band or nav rules, and I couldn't trace it to a page sheet.
- Daniel (`OWN-DANI`) isn't captured. With the desk harness he gets "Page not found" on /app/ai-manager, because his
  one-location access is set up only by the scoped harness (`run-scoped.sh`, `NEVORA_SCAN_LIMITED`), which has no
  Rondo flags. His Rondo is the same component as Elena's, with the location as fixed text.
- Captures (production build): Owner H1–H6 and Elena H1, H5 and H6 at 390, 390 viewport-height (`-390-fold`), 768,
  1440 and 390 with 200% text. Overflow 0 everywhere. Axe 0 except the known Insights band-line false positive at 768
  and 1440.

## Third follow-up: band titles, Daniel, one consistent set (code `ceb19391`, after merge `481851c9`)
- Phone band titles: the shell sets `.c-nav--phone .c-nav__title` to 28px/34px (`@layer nv-b`). On Rondo AI, Weekly
  plan, Business records, Company knowledge and Insights the page sheets now set 1.75rem/2.125rem, the same at 100%, so
  the title doubles with 200% text.
- Daniel (`OWN-DANI`, Condado only), H1: captured with the location Manager harness (`run-scoped.sh`), with Rondo turned
  on in a scratch copy of the harness. Overflow 0, no clipping or overlap, axe 0 at 390, 390 with 200% text, 768 and 1440.
- One consistent set from `ceb19391` (production build): Owner H1–H6, Elena H1, H5 and H6, Daniel H1. Each at 390, 390
  at screen height, 390 with 200% text, 768 and 1440. Files are in `shots/rondo/img/` (`<row>-<o|m|ml>-<390|390-fold|390t|768|1440>.webp`),
  listed in `shots/rondo/rows.json`. Overflow 0 everywhere. Axe 0 except the known Insights band-line false positive
  at 768 and 1440. At 200% the only fixed-size text left is the Insights segment label and the kit pill
  "… under plan".
