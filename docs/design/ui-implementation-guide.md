# How NEVORA UI is built: the implementation guide

For Codex and every other agent that changes NEVORA screens. Written by Claude on Nov 24, 2026 from the code on
`claude-codex-collab-nevora` (release candidate 4272b902) and Jose's decisions in the Phase 2 queue.

This guide is not a style essay. Each rule is something the current UI already does, with the file it lives in. If
your change doesn't match a rule here, either your change is wrong or the rule needs Jose's decision. It is never
"close enough".

Precedence when sources disagree, highest first:

1. Jose's explicit instruction.
2. `DESIGN.MD` (current direction, then the dated refinement for the route), `.21st/DESIGN.md`, and
   `docs/design/voice.md` for product copy.
3. The live tokens in `src/app/b-tokens.css`.
4. `.claude/skills/nevora-design-os/` (shared with Codex through `.codex/skills/nevora-design-os/`), including
   `references/density.md` and `references/audit.md`.
5. This guide (it explains how 1 to 4 are implemented; it never overrides them).

---

## 0. Your two questions (Spanish at 390 px)

### 0.1 Buttons: can width grow to keep "Editar" on one line?

Yes. A button's width follows its label, so it grows. Its label never wraps, shrinks or truncates. The full rule:

1. **Height is fixed by token; width is never fixed for a text button.** `--b-btn-h` 44px (standard),
   `--b-btn-h-band` 48px (on the band), `--b-btn-h-full` 52px (full-width main action), `--b-btn-h-compact` 36px
   (inside dense rows only, and then it needs a 44px reach ring, section 7). Never set `width:` in px on a text
   button. `min-width` is allowed (for example `min-width: 96px` on `.q-bs`), `max-width: 100%` is required.
2. **The label stays on one line** at 320, 390, 768, 1440 and at 200% text. `white-space: nowrap` on the label is
   correct *only* together with rule 4's fallback. Never `text-overflow: ellipsis` on a button label. Never lower
   `font-size` or `letter-spacing` to make a label fit.
3. **Buttons in one row share one height** and their labels are centred. In a two-button row (Cancel / Save,
   Cancel close / Record close) the buttons are equal width.
4. **If either label in a row doesn't fit on one line, the whole row stacks**: every button becomes full width,
   same height, in the same order (main action first in reading order for single actions, Cancel before the main
   action in a pair, as `management-close-form.tsx` does). This happens at a breakpoint or through a container
   query; it is never a per-language special case in JSX.
5. **A button never grows past its container** (`max-width: 100%`). If a single label is longer than the
   container at 200% text, it may wrap inside the button as the last resort (see `.b-statecard .b-btn` in
   `b-foundation.css:335`: `max-width: 100%; white-space: normal; text-align: center`). That's allowed only in
   state cards and only at enlarged text; at the default size, a wrapped button label is a bug.
6. **Shorter wording is a copy decision, not a layout fix.** Use a short form only if `voice.md` or the Spanish
   glossary already has it. Otherwise ask Jose. "Editar" is fine and fits; keep it.

So for Owner Home and Owner Profile at 390: let the button width grow; if a pair no longer fits side by side, stack
both full width. Don't change the English row to match.

### 0.2 Setup rows: wrap and grow taller, or shorten the wording?

Wrap and grow taller. Never shorten approved wording to keep the English row height. The English height is not a
target; the minimums are.

1. **Rows have a minimum height, never a fixed height**: 44px minimum for any tappable row, 56px for a kit row with
   a lead icon or avatar. Use `min-height`, never `height`.
2. **Product copy (titles we write) never truncates.** A row title we wrote wraps to a second line. A third line
   means the wording is too long; that's a copy question for Jose, not a CSS fix.
3. **User data may truncate at the default size only** (a person's name, a place name, a note). Settings and Team
   rows show title and detail on one line with an ellipsis at the default size, and wrap once the reader enlarges
   text. That's the `--nv-rem` container query in `owner-b-pages.css:740`:

   ```css
   @property --nv-rem { syntax: '<length>'; inherits: true; initial-value: 16px; }
   body { --nv-rem: 1rem; }
   @container not style(--nv-rem: 16px) {
     /* wrap: white-space normal, overflow visible, text-overflow clip */
   }
   ```

   Spanish product copy must not ride on that ellipsis. If a Spanish *label* (not data) is cut at the default size,
   give that label `white-space: normal` so it wraps at every size.
4. **The row's other parts keep their alignment when it grows.** Lead icon centred on the *first* text line
   (`align-items: start` with the icon box matching the first line height), chevron vertically centred on the row,
   trailing value on its own right edge with `font-variant-numeric: tabular-nums`.
5. **A row is a title plus one detail line** (density rule). Spanish may wrap each of those to two lines; it may not
   add a third element.

### 0.3 Applies to both: what "expected difference" means

Spanish rows that are taller and buttons that are wider are **expected**. These are **bugs**:

- a label cut with "…" that isn't user data;
- a label wider than its button, or text overlapping an icon or chevron;
- two buttons in a row with different heights;
- a stacked layout in one language and side-by-side in the other on the same screen size, *when both fit side by
  side*;
- horizontal page scroll;
- English text left in a Spanish screen (outside people's own data);
- wording changed to fit.

---

## 1. Before you change anything

1. Read `DESIGN.MD` (current direction plus the dated refinement for your route), `.21st/DESIGN.md`,
   `docs/design/voice.md`, `docs/design/component-picks.md` and the design OS skill folder.
2. `git status` first. Never overwrite someone else's uncommitted work. Use a separate worktree if the checkout is
   busy.
3. Find the existing Direction B screen for this role and route, and the kit component. Search before you write:
   `rg "export function B" src/components/owner-b/b-kit.tsx`.
4. Keep server behaviour and data contracts as they are. A UI change that needs a server change stops and asks.
5. Payroll, tax, legal, billing and privacy wording is approved word for word. Don't edit, shorten or "improve" it.

---

## 2. Architecture of the UI layer

- **Direction B** is the current design. A signed-in screen is inside `.app-shell[data-nv-b]`. Phone views often
  also carry `[data-employee-mobile]`.
- **Kit components** live in `src/components/owner-b/b-kit.tsx`. Use these before writing anything new:
  `BScreen`, `BHero`, `BLive`, `BSeg`, `BStack`, `BCard`, `BList`, `BRow`, `BChip`, `BStatusText`, `BCount`,
  `BGlyph`, `BCallout`, `BAvatar`, `BFaces`, `BIcon`, `BButton`, `BButtonLink`, `BBusyLabel`, `BSpin`, `BInk`,
  `BNote`, `BFilters`, `BWhen`, `BSegs`/`BSegsText`, `BDoneMark`, `BLoadingScreen`, `BStateScreen`, `BState`.
  Companion pieces are in the same folder: `b-loading.tsx`, `b-route-error.tsx`, `b-offline.tsx`,
  `kept-result.tsx`, `decision-parts.tsx`.
- **Corp layers** (`.c-page`, `.c-card`, `.c-row`, `.c-btn`, `corp*.css`) are older markup that Direction B
  restyles. When you touch a Corp page, make it look and behave like the kit. Don't add a third style.
- **Styles live by scope.** Tokens in `src/app/b-tokens.css`, kit base in `src/components/owner-b/owner-b.css`,
  shared shell and fixes in `src/app/app/b-foundation.css`, owner page groups in `src/app/app/owner-b-*.css`,
  desktop in `owner-b-desktop.css`, and per-feature files next to their component. Put a rule in the narrowest
  file that owns the element.
- **Selector convention.** Existing rules use high-specificity prefixes such as
  `:is(#c-root, html) :is(#c-root, body) :is(#c-root, .app-shell)[data-nv-b] …` and often `!important`, because they
  must beat older Corp CSS. Match the prefix of the rule you're overriding; don't invent a stronger one to win a
  fight. Check the cascade in the browser before adding specificity.
- **`@layer nv-b` exists** (in `b-foundation.css`, `corp-quiet-bridge.css`, `legal.css`). A layered `!important`
  beats any unlayered `!important`. If your rule must override a layered `!important`, it must be in the same layer.

---

## 3. Tokens: never use raw values that have a token

From `src/app/b-tokens.css` and the spacing scale in the app CSS.

| Group | Tokens |
|---|---|
| Spacing | `--b-space-2/4/8/12/16/20/24/32/40/48/64` (px). Nothing off-scale. |
| Gutters and insets | `--b-gutter` 14px (phone page edge), `--b-inset` 18px (card padding), `--b-inset-wide` 22px (desktop card padding) |
| Frames | `--b-frame-form` 560px, `--b-frame-read` 812px, `--b-frame-wide` 1080px |
| Band | `--b-band` gradient, `--b-band-solid` #0C726C, `--b-band-ink` dark gradient, heights `--b-band-short` 196, `--b-band-sub` 224, `--b-band-strip` 296, `--b-band-figures` 363 |
| Type (rem) | `--b-fs-display` 1.875 / `--b-lh-display` 2.25; `--b-fs-figure` 1.5 / 1.875; `--b-fs-title` 1.25 / 1.625; `--b-fs-title-sm` 1.0625 / 1.375; `--b-fs-body` 0.96875 / 1.375; `--b-fs-body-sm` 0.90625 / 1.25; `--b-fs-meta` 0.84375 / 1.125; `--b-fs-caption` 0.78125 / 1 |
| Ink | `--b-ink` #111517, `--b-ink2` #3F464B, `--b-grey` #6A7176, `--b-grey-on-fill` #5E666B, `--b-on-band` #FFF, `--b-on-band-2` 86% white |
| Brand and tones | `--b-teal` #0B6E69, `--b-teal-50`, `--b-teal-edge`; amber, green, red each with `-50`, `-edge`, `-solid` where defined; `--b-coral` |
| Surfaces | `--b-canvas` #F2F5F4, `--b-line`, `--b-hair`, `--b-hair-strong`, `--b-quiet`, `--b-glass`, `--b-scrim`, `--b-elev-1/2/3` |
| Radius | `--b-radius-card` 22, `--b-radius-field` 14, `--b-radius-menu` 16, `--b-radius-btn` 10, `--b-radius-btn-sm` 8, `--b-radius-small` 10, `--b-radius-pill` 999 |
| Controls | `--b-btn-h` 44, `--b-btn-h-band` 48, `--b-btn-h-full` 52, `--b-btn-h-compact` 36, `--b-chip-h` 22, `--b-count-h` 20, `--b-field-edge` |
| Icons | `--b-ic-inline` 16, `--b-ic-lead` 18, `--b-ic-control` 20, `--b-ic-state` 22, `--b-ic-tab` 24, `--b-ic-finish` 28, `--b-ic-chip` 12 |
| Focus | `--b-focus` #0B6E69, `--b-focus-on-band` #FFF, `--b-focus-width` 2px, `--b-focus-offset` 2px |
| Motion | `--b-dur-press/hover/exit` 150ms, `--b-dur-note` 240, `--b-dur-enter` 300, `--b-dur-draw` 320, `--b-dur-settle` 420, `--b-dur-ring` 520; `--b-ease-out`, `--b-ease-settle`; `--b-press-scale` 0.96 |

Rules:

- Raw hex, px font sizes and ad-hoc durations are bugs when a token exists. A new colour needs Jose.
- Icons are Phosphor only (`@phosphor-icons/react/ssr`), sized with the icon tokens. No other icon family.
- Fonts are the existing pair (Inter with its fallback stack). No font changes.

---

## 4. Layout and alignment

1. **Phone page edge is `--b-gutter` (14px).** A band or sheet that reaches the screen edge must do it with the gutter,
   not by running past it (a 2px overrun at 390 made pages 392 wide: kit-final 8cf3a719).
2. **Inside a card, all text shares one left edge** (the card inset); figures share one right edge with
   `font-variant-numeric: tabular-nums`; card padding is equal on all sides; the band's content lines up with the
   cards below it.
3. **Measure, don't eyeball.** Use `getBoundingClientRect()` at 320, 390, 768, 1024 and 1440. A 1px misalignment is a
   bug.
4. **No horizontal page scroll at any width or text size.** Give flex and grid children that hold text
   `min-width: 0`.
5. **Titles use `text-wrap: balance`.**
6. **Each fact appears once per screen** (band and card, card title and row, heading and button never repeat the same
   fact). The band holds the title and at most three figures. One Solid teal main action per card.
7. **Spacing comes from the scale and from the kit's own gaps.** Don't zero a kit margin to "tighten" a layout. The
   empty Time off card overlapped its tabs by 14px because someone forced `margin-top: 0` (fixed in 397f37d0).

---

## 5. Type and large text (200%)

1. **Text sizes are rem tokens.** A px font size on text is a bug: it doesn't grow when the reader enlarges text.
   Converting px to rem at the same default size (15px = 0.9375rem) is invisible at 100% and correct at 200%.
2. **Caps are allowed where layout truly can't grow** (a fixed-width tab bar): use `min(<rem>, <px cap>)`, as the
   phone tab bar labels do (`min(0.65625rem, 13px)`), and prove at 320 and 390 at 200% that nothing clips.
3. **At 200% text, things wrap; nothing clips, overlaps or overflows.** Chips wrap instead of ellipsing. Value
   columns move under their labels (Profile approval rows, Manager rows). Counts stay centred on their label line.
4. **Test 200% by text size, not by page zoom.** Raise the root font size (QA uses a 32px root) so rem tokens double
   while the viewport stays 390.
5. **Use `--nv-rem` for "wrap only when enlarged"** (section 0.2). It's a registered custom property resolved on
   `body`; on the root element rem would read the browser's initial size.

---

## 6. Buttons

1. Kit buttons: `BButton` and `BButtonLink` (`.b-btn`), kinds from the kit (`teal` Solid main action, surface
   secondary, quiet). Corp `.c-btn` is restyled to match; prefer the kit.
2. Heights from the button tokens (section 0.1). Radius `--b-radius-btn` (10px, Jose, Nov 21).
3. **One Solid teal main action per card.** Destructive actions use the red tone and confirm first.
4. **Busy state:** `BBusyLabel` keeps the button's width and swaps in a spinner and busy label; disable repeat
   presses. Never let a button resize while saving.
5. **Disabled buttons need a reason line**, not a grey button with no explanation (Timecards D1: one line says what
   comes first).
6. **Order in a pair:** Cancel then the main action, both on the card's inset. In failed or retry states the filled
   retry comes first in layout *and* focus order (billing 7c3d1bf9).
7. Rules for wrapping and stacking: section 0.1.

---

## 7. Tap targets: 44px reach without changing what's drawn

1. **Every control reaches at least 44×44px from its centre.** It may be *drawn* smaller (a 36px compact button, a
   32px back link) if a transparent ring gives the reach.
2. **The ring pattern** (see `owner-b-pages.css`, release target batch):

   ```css
   .control { position: relative; }            /* the ring needs a positioned parent */
   .control::after {
     content: ""; position: absolute;
     /* each side grows only if the control is under 44px */
     top: min(0px, calc(50% - 22px)); bottom: min(0px, calc(50% - 22px));
     left: min(0px, calc(50% - 22px)); right: min(0px, calc(50% - 22px));
     border-radius: 0;                          /* hit-testing follows rounded corners; keep rings square */
   }
   ```

   Raise the control's stacking (`z-index`) only as much as needed so a neighbour or an empty-state card doesn't sit
   over the ring. Check that two neighbouring rings don't overlap; where they must meet, the earlier one in the DOM
   gets the higher `z-index` (Team filters 484385e4).
3. **Hidden content must not be hit-testable or focusable.** Closed disclosure content is `display: none`, not just
   visually hidden (Publish "Start from", 7c2e82bdd).
4. **Measure reach the way QA does:** `document.elementFromPoint` at ±21.5px left, right, up and down from the
   control's centre, after scrolling it into view, on a production build, with touch emulation at phone widths and a
   mouse at desktop widths. Every point must land on the control or a descendant.
5. **Allowed exception:** WCAG 2.5.8 spacing (24px) where 44px can't fit without moving layout: the 320 week strip
   (7 days in 296px) and the desktop sidebar links (40–42px). It's allowed only where it's already documented; don't
   add new ones without asking.

---

## 8. States: every screen has all of them

Use the kit: `BState` (empty, closed, failed, unavailable), `BStateScreen`, `BLoadingScreen`, `BOffline`,
`BRouteError`, `kept-result.tsx` for results that must survive a refresh.

| State | Rule |
|---|---|
| Loading | Skeleton from `BLoadingScreen` with the real page's frame, no layout jump when content arrives (CLS ≈ 0). |
| Slow | After `STUCK_MS` (2500ms, `scoped-read-frame.tsx`), replace the "checking" line in place with the slow line, in the same `role="status"` live region. Don't flip to an error just because it's slow. |
| Empty | Says what will appear and, if useful, the one next step. Role-specific when permissions differ (a location Manager sees "No requests you can review" plus the Owner line, not "You're all caught up"). |
| Failed | Honest: what didn't happen, plus "Try again" first. Never "Nothing was changed" unless the server confirmed it. |
| Unconfirmed | After a lost reply: "couldn't be confirmed" plus "Check again", which reads before allowing a retry (Add shift, Publish). |
| No permission | A distinct message, never "session ended". |
| Offline | `BOffline`; actions that need the network are disabled with a reason. |

Background refresh must not remount what the person is using. Key a subtree only on what truly identifies it. The
Payroll export form lost typed text every 10s because its key included a live running total (fixed 8571f141). See
section 11.

---

## 9. Copy and Spanish

1. Product copy follows `docs/design/voice.md`: plain, specific, sentence case, no clichés, no exclamation marks, no
   "simply", no explaining how the screen works.
2. **Every user-facing string lives in a `{ en, es }` copy table** next to its component (`*-copy.ts`), with a
   key-match test that fails if one language is missing a key. Don't put inline literals in JSX for product copy.
3. **Language source:** server pages call `readPortalLanguage(proof)` (Profile choice, then the `nv-lang` cookie, then
   Accept-Language, then English). Client components call `usePortalLang()` from `src/lib/i18n/portal-lang.tsx`.
   Shared nav words come from `src/components/shell-copy.ts`. Set `<html lang>` and `lang` on regions correctly.
4. **Spanish:** tú (never usted); glossary terms only (tarjeta(s) de tiempo, Localidad, Días libres, Informes,
   Dueño, Turno disponible…). Open glossary questions are in
   `docs/handoffs/2026-11-23-phase2-cloud/reports/es-integration.md`; don't decide them yourself.
5. **Dates and times** use the lang-aware helpers. Never rewrite English output with string maps.
6. **Never compare against display text in logic** (a "missed" chip broke in Spanish because code compared to the
   English word). Compare status codes and flags.
7. Sizing rules for longer Spanish: section 0.

---

## 10. Accessibility

1. axe (wcag2a, wcag2aa, 2.1, 2.2) at 0 violations on every view you touch, at 390 and 1440.
2. **The accessible name contains the visible label, first** (WCAG 2.5.3). Don't override a row's name with an
   `aria-label` that drops what's shown. If a component joins spans, put real text spaces between them
   ("MondayAll day" failed; 504b63f6).
3. **Focus ring:** `--b-focus-width` solid `--b-focus` (or `--b-focus-on-band` on the band), offset
   `--b-focus-offset`, on `:focus-visible`. Focus moves to the result after a sheet or action finishes.
4. **Contrast** 4.5:1 for text, including placeholders (use the kit greys). axe can't composite translucent glass
   over the band; sample the rendered pixels and record the real ratio rather than greying out good text (Team search
   6.2:1).
5. **Forced colours:** buttons get an inset `ButtonText` outline (`GrayText` when disabled); see
   `forced-colors-buttons.test.ts`.
6. **Reduced motion:** every animation has a reduced-motion path. **Never put a pseudo-element inside `:is()`,
   `:where()`, `:not()` or `:has()`.** Browsers drop the whole rule silently. `b-reduced-motion.test.ts` blocks it.
7. Live regions: status changes use `role="status"` in a region that exists before the change.

---

## 11. React and Next.js pitfalls we've already hit

| Pitfall | Rule |
|---|---|
| Keyed remounts | `key` changes destroy state. Key on identity, never on data that changes every read (timestamps, running totals). |
| Hidden `Activity` | A hidden React Activity tears its effects down and runs them again when shown; mount effects then reset state. Hide in place instead (scoped read frame, d3bbe73b). |
| Prefetch on sight | Links prefetch on intent via `NavigationLink intent="auto" \| "full"` (pointer, focus, touch start). Plain `<Link>` in always-visible chrome re-reads pages every refresh. |
| Client imports | A client component must not import a DB or server-only module (it 500s under Turbopack). |
| Duplicate imports | Two identical imports pass tsc but fail Turbopack. Load every changed route in the dev server, don't trust tsc alone. |
| Router reads | Background refresh uses `startTransition(() => router.refresh())`, never navigation. |
| Real clock in tests | Tests that render greetings or "today" pass a fixed time. |

---

## 12. CSS pitfalls we've already hit

- Pseudo-elements inside `:is()` and friends: the rule is dropped (section 10.6).
- A layered `!important` beats every unlayered rule (section 2).
- The build dropped `translate: none`; use `translate: 0` when you need to reset.
- Rounded hit rings miss corner taps; keep rings square (section 7).
- `white-space: nowrap !important` on a parent silently overrides a child's wrap; check computed styles.
- Forcing `margin: 0` on a kit element removes a gap that something else depends on.
- Gradients: matching a band colour with a flat fill shows a strip at large text. Use `background-clip: text` or the
  band itself (Insights range, 2d340c6d).

---

## 13. How a change is verified (definition of done)

Nothing is reported as done until all of this is true, with evidence:

1. **Tests next to the change** (render and CSS rule tests under `src/app/app/*.test.ts`, `kit-text-rem.test.ts`,
   `target-size-44*.test.ts`), plus `node scripts/run-rstest.mjs src/components src/app --reporter=json`,
   `npx --no-install tsc --noEmit -p .` and oxlint, all clean.
2. **Browser evidence on a production build** (`next build && next start`, the QA harness serves it over https so
   WebKit keeps the secure cookie), fictional data only, never production credentials or real notifications.
3. **Views:** 320, 390, 768, 1024 and 1440 at 100%, plus 390 and 1440 at 200% text. Spanish too when copy changes.
   Chromium and WebKit.
4. **Probes per view:** horizontal overflow, clipped text, overlapping text, 44px reach (section 7.4), axe, focus order
   and visible rings, reduced motion.
5. **Before-and-after screenshots and a default-size pixel diff** proving nothing moved except what you meant; any
   other difference is explained (live data) or fixed.
6. **The Impeccable audit** from `references/audit.md` on your own result (hierarchy, spacing, accessibility, states),
   reported in its format.
7. **Commits:** code separate from screenshots and reports; one finding per commit; the message says what changed
   for a person, not just the file.

---

## 14. Anti-slop checklist: reject your own change if any line is true

- [ ] I wrote a new component when a kit component exists.
- [ ] I used a raw hex, px font size, off-scale spacing or a hard-coded duration.
- [ ] A label is truncated, shrunk, letter-spaced or reworded to fit.
- [ ] Two buttons in a row differ in height, or one wraps at the default size.
- [ ] A row or card has a fixed `height`.
- [ ] Text uses px, so it won't grow at 200%.
- [ ] A control reaches less than 44px and isn't in a documented exception.
- [ ] Something is visually hidden but still focusable or clickable.
- [ ] The same fact, count or name appears twice on the screen.
- [ ] There's more than one Solid teal action in a card.
- [ ] A state (loading, slow, empty, failed, unconfirmed, no permission, offline) is missing or dishonest.
- [ ] A product string is inline in JSX instead of a `{ en, es }` table, or Spanish uses usted.
- [ ] Logic compares displayed text instead of codes.
- [ ] A `key` includes data that changes on refresh.
- [ ] A pseudo-element sits inside `:is()`, `:where()`, `:not()` or `:has()`.
- [ ] I only ran tsc, or only a development build, or only Chromium, or only 1440.
- [ ] I changed payroll, legal, tax, billing or privacy wording.
- [ ] I changed server behaviour or a data contract from a UI task.
- [ ] I can't point to the screenshot that proves it.
