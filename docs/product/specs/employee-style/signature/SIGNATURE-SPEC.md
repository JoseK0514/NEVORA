# Signature: the NEVORA design system for employees, sign-in and the Clocker

October 20, 2026 · Status: **approved direction** · Owner: Jose (decisions), UI Designer (this text)

This file is the written source of truth for the Signature look. It covers:

- the employee app (Employee and Lead roles, the shell's `data-nv-e5` scope);
- sign-in, forgot access, reset access and account activation (the `.ap` frame);
- the shared Clocker tablet and its PIN setup.

Manager and Owner are **not** covered. They keep their own approved design, the Wave A v3 light mockups
(`docs/product/specs/clean-manager/`, built in `src/app/app/premium-clean-manager.css`). Moving Manager onto the
Signature neutrals is a later step (review gap 15).

Where this file and an older section of `DESIGN.MD` or `.21st/DESIGN.md` disagree for these surfaces, this file wins.

Every value below was read from the code on branch `claude/sig-tokens-c320b9` (cut from `claude/auth-premium` at
`65d31dff`). "Built" means it is in the code today. "Target" means it is agreed but not built yet. Review gaps refer to
`docs/product/reviews/gap-analysis-2026-10-20/ui-designer.md`.

---

## 1. Principles

Jose's bar for Signature is **premium, clean and user friendly**. In practice:

1. **One message per card.** A card says one thing. A second message gets its own card or its own line under the card.
2. **No glass.** No `backdrop-filter`, no blur, no frosted or translucent panels over content. Surfaces are solid.
   The tab bar's 96% soft white and the band's white-at-10% chips are tints on a solid colour, not glass.
3. **Phosphor icons, regular weight.** Fill is used only for the active tab. No duotone, no hand-drawn SVG.
4. **No illustration on Home.** Home is the band, the shift card and lists. Nothing decorative beyond the Λ mark and
   grain on the band.
5. **The band carries the page's key fact; the sheet carries the detail.** A deep band at the top holds one eyebrow
   and one large light word or figure. The soft-white sheet below holds sections of white cards.
6. **Calm, not trendy.** Trust is the overriding rule (`docs/product/TEAM-RULES.md`). If a choice could make someone
   wonder whether the app is safe, do not make it.

---

## 2. Surfaces and where they live

| Surface | Scope | Main files |
|---|---|---|
| Employee app shell (phone header, tab bar, More sheet, skeletons, section tabs) | `.app-shell[data-nv-e5]` | `src/app/app/employee-style.css` |
| Shared Signature frame (band, sheet, cards, rows, tickets, CTA) | `.sgRoot` (`data-sig`) | `src/components/signature/signature.module.css`, `signature.tsx` |
| Employee Home | `.h5Root` | `src/components/employee-home-today.module.css` |
| My schedule | `.s6Root` | `src/components/employee-my-schedule.module.css` |
| Requests hub | `.r6Root` | `src/app/app/requests/hub/request-hub.module.css` |
| Page modules on the frame | `*-signature.module.css` | 12 files under `src/components/` and `src/app/app/` |
| Not found and error | `.ssRoot` | `src/components/signature/system-state.module.css` |
| Sign-in family | `.ap` | `src/app/login/auth-premium.css`, then `src/app/login/auth-signature.css` |
| Account activation | `.ap` + `act-*` | `src/app/activate/activation.css` |
| Clocker | `.page` | `src/components/clocker-shell.module.css`, `clocker-pin.module.css`, `clocker-setup.module.css` |

The token file `src/components/signature/tokens.css` (section 3) declares the shared values on `:root`.

---

## 3. Tokens

The file is `src/components/signature/tokens.css`. It declares **104 canonical `--sig-*` tokens and 7 aliases** on
`:root`, and `src/app/layout.tsx` imports it first, ahead of every other stylesheet. Each value equals what renders
today on the shared employee frame, so loading the file changes nothing on screen. Where two approved surfaces
disagreed, the token takes the shared frame's value (`signature.module.css`), then the sign-in / activation value, then
the Clocker's. Every losing value is listed in section 16.

### 3.1 How to use the tokens

1. **Pages read `--sig-*`.** A page or component never declares its own palette, type stack, grain or shadow.
2. **Legacy prefixes are aliases now.** `--sg-*`, `--e5-*`, `--h5-*`, `--s6-*`, `--r6-*`, `--ck-*`, `--clocker-*`,
   `--act-*` and the sign-in names (`--cream`, `--paper`, `--ink`, `--ink-2`, `--ink-3`, `--rule`, `--edge`, `--deep`,
   `--mark`, `--sky`, `--mint`, `--teal`, `--display`, `--sys`, `--danger`, `--done`) will point at `--sig-*` as each
   file is migrated. Do not extend them: no new names under these prefixes, and no new reads of them in new code.
3. **Conflict rule.** If a file renders a value that differs from the token, it keeps its literal value with the
   comment `/* sig conflict: keeps <hex>, canonical --sig-x is <hex>; see SIGNATURE-SPEC */`. Never change a rendered
   value to "fix" a conflict; that needs a decision (section 17).
4. **The four `--clocker-*` accent names stay as the brand layer.** `clockerBrandStyle` in `derive.ts` sets them inline
   for a branded company; only their defaults point at `--sig-*`.
5. **`--sig-shadow-card` includes the 6% ink inset edge** (it is what `.sg-card` renders). `--sig-shadow-card-lift` is
   the lift only. Map `--sg-card-shadow` to `--sig-shadow-card-lift`, or the edge is drawn twice.
6. **Use `--sig-control-edge` for field borders, never `--sig-edge`.** `--sig-edge` would drop the field boundary from
   3.75:1 to 1.33:1 and fail WCAG 1.4.11.
7. **Add before you use.** A value that is not a token yet is added to `tokens.css` first.
8. **Type:** `font: var(--sig-type-<role>); letter-spacing: var(--sig-tracking-<role>);`.
9. **Dark mode:** every token has a dark column. All are "—" (unset) today.

### 3.2 Token table

Values are copied from `tokens.css`. Ratios in the role column are WCAG 2.x, measured by the token architect and
re-checked for this spec (section 9.5). The grain value is a long data URI; see the file.

#### Colour

| Token | Value | Role | Dark |
|---|---|---|---|
| `--sig-page` | `#F7F6F3` | page and soft-white sheet | — |
| `--sig-card` | `#FFFFFF` | card / list surface | — |
| `--sig-ink-1` | `#161C1B` | primary text, 17.27 white / 15.98 page | — |
| `--sig-ink-2` | `#5F625E` | secondary text, 6.19 white / 5.72 page | — |
| `--sig-ink-3` | `#6F6C66` | tertiary text, caps labels, 5.23 white / 4.84 page | — |
| `--sig-faint` | `#B9B6AF` | decorative only (chevrons, idle dot); 2.02 on white, fails as text | — |
| `--sig-rule` | `#E8E5DF` | hairlines inside cards and lists | — |
| `--sig-edge` | `#E3DFD8` | 1px edge of raised cards (Clocker, activation) | — |
| `--sig-control-edge` | `#8A8378` | input field edge on desktop sign-in, 3.75 white / 3.47 page | — |
| `--sig-track` | `#EEECE7` | tracks, segmented-control frame, count chip | — |
| `--sig-deep` | `#0D3634` | the band, primary fill | — |
| `--sig-deep-hover` | `#12423F` | primary fill on hover (employee) | — |
| `--sig-mark` | `#164B48` | the Λ mark on the band; Clocker deep hover | — |
| `--sig-sky` | `#35B6EC` | mark accent, unread dot; 5.68 on deep | — |
| `--sig-mint` | `#A9E2DA` | accent on deep (live dot, emphasis); 9.14 on deep | — |
| `--sig-action` | `#0B6E69` | teal action ink (links, act, icons); 6.09 white / 5.63 page | — |
| `--sig-action-wash` | `#E3F0EC` | teal wash behind action ink; 5.23 with action ink | — |
| `--sig-on-deep` | `#FFFFFF` | text and icons on the band; 13.17 on deep | — |
| `--sig-on-deep-2` | `rgba(255, 255, 255, .74)` | band sub-line; 7.93 on deep (blended) | — |
| `--sig-on-deep-3` | `rgba(255, 255, 255, .62)` | band eyebrow / caps; 6.05 on deep (blended) | — |
| `--sig-on-deep-rule` | `rgba(255, 255, 255, .14)` | hairline on the band | — |
| `--sig-scrim` | `rgba(10, 22, 21, .38)` | backdrop behind the More sheet | — |

#### Status

| Token | Value | Role | Dark |
|---|---|---|---|
| `--sig-done-ink` | `#0A5753` | done / approved pill ink; 7.21 / 8.40 / 7.77 | — |
| `--sig-done-wash` | `#E2F1ED` | done pill wash | — |
| `--sig-done-line` | `#C8DCD6` | new: not yet used; done edge (hex from activation.css:11 spinner track) | — |
| `--sig-review-ink` | `#8A5208` | review / pending / due; 5.62 / 6.38 / 5.90 | — |
| `--sig-review-wash` | `#FBEFDC` | review wash | — |
| `--sig-review-line` | `#F2E4CD` | review edge (amber card, amber card foot) | — |
| `--sig-urgent-ink` | `#A3271A` | urgent / declined / sign out; 6.44 / 7.34 / 6.79 | — |
| `--sig-urgent-wash` | `#FBEDEC` | urgent wash; no employee use yet, renders on activation error | — |
| `--sig-urgent-line` | `rgba(163, 39, 26, .3)` | urgent edge (#E3BEBA over white) | — |
| `--sig-info-ink` | `#55585A` | info / neutral pill ink (the untoned pill); 6.13 / 7.17 / 6.63 | — |
| `--sig-info-wash` | `#EFEDE8` | info / neutral pill wash | — |
| `--sig-info-line` | `#E3DFD8` | new: not yet used; info edge (same hex as --sig-edge) | — |

#### Type

| Token | Value | Role | Dark |
|---|---|---|---|
| `--sig-font` | `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", sans-serif` | text stack | — |
| `--sig-font-display` | `-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", sans-serif` | display stack (light figures, band headings) | — |
| `--sig-font-clocker` | `'Nevora Clocker', -apple-system, BlinkMacSystemFont, sans-serif` | Clocker only (bundled Inter, @font-face at clocker-shell.module.css:1); recorded, not adopted | — |
| `--sig-type-hero-word` | `300 2.875rem/3.125rem var(--sig-font-display)` | band word, 46/50 ("Off clock") | — |
| `--sig-tracking-hero-word` | `-.04em` | letter-spacing for hero-word | — |
| `--sig-type-hero-figure` | `200 3.75rem/3.875rem var(--sig-font-display)` | band figure, 60/62 (date), tabular | — |
| `--sig-tracking-hero-figure` | `-.045em` | letter-spacing for hero-figure | — |
| `--sig-type-hero-duration` | `200 3.375rem/3.5rem var(--sig-font-display)` | band duration, 54/56, tabular | — |
| `--sig-tracking-hero-duration` | `-.04em` | letter-spacing for hero-duration | — |
| `--sig-type-headline` | `300 2.5rem/2.75rem var(--sig-font-display)` | band headline, 40/44 | — |
| `--sig-tracking-headline` | `-.035em` | letter-spacing for headline | — |
| `--sig-type-figure-ticket` | `200 3.5rem/3.375rem var(--sig-font-display)` | date-ticket figure on a card, 56/54 | — |
| `--sig-tracking-figure-ticket` | `-.045em` | letter-spacing for figure-ticket | — |
| `--sig-type-figure-day` | `300 1.75rem/1.875rem var(--sig-font-display)` | day number in rows, 28/30 | — |
| `--sig-tracking-figure-day` | `-.03em` | letter-spacing for figure-day | — |
| `--sig-type-row` | `500 1.0625rem/1.375rem var(--sig-font)` | row title, 17/22 | — |
| `--sig-tracking-row` | `-.012em` | letter-spacing for row | — |
| `--sig-type-row-sub` | `400 .9375rem/1.25rem var(--sig-font)` | row second line, 15/20 | — |
| `--sig-tracking-row-sub` | `0` | letter-spacing for row-sub | — |
| `--sig-type-body` | `400 1rem/1.375rem var(--sig-font)` | body, band sub-line, 16/22 | — |
| `--sig-tracking-body` | `0` | letter-spacing for body | — |
| `--sig-type-callout` | `400 .9375rem/1.3125rem var(--sig-font)` | callout / notes / empty, 15/21 | — |
| `--sig-tracking-callout` | `0` | letter-spacing for callout | — |
| `--sig-type-link` | `500 .9375rem/1.25rem var(--sig-font)` | text link / quiet action, 15/20 | — |
| `--sig-tracking-link` | `0` | letter-spacing for link | — |
| `--sig-type-button` | `500 1.0625rem/1 var(--sig-font)` | full-width action, 17 | — |
| `--sig-tracking-button` | `0` | letter-spacing for button | — |
| `--sig-type-caps` | `600 .75rem/1rem var(--sig-font)` | tracked caps label, 12/16, uppercase | — |
| `--sig-tracking-caps` | `.13em` | letter-spacing for caps | — |
| `--sig-type-caps-sm` | `600 .6875rem/.875rem var(--sig-font)` | small caps (day, ticket, pair), 11/14, uppercase | — |
| `--sig-tracking-caps-sm` | `.12em` | letter-spacing for caps-sm | — |
| `--sig-type-pill` | `500 .8125rem/1 var(--sig-font)` | status pill, 13 | — |
| `--sig-tracking-pill` | `.01em` | letter-spacing for pill | — |
| `--sig-type-tab` | `500 .8125rem/1rem var(--sig-font)` | tab-bar label, 13/16 (declared preset; rendered size not browser-verified) | — |
| `--sig-tracking-tab` | `0` | letter-spacing for tab | — |

#### Spacing

| Token | Value | Role | Dark |
|---|---|---|---|
| `--sig-space-4` | `4px` | desktop heading inset | — |
| `--sig-space-8` | `8px` | eyebrow gap | — |
| `--sig-space-12` | `12px` | heading to list, card to card | — |
| `--sig-space-16` | `16px` | card / list side margin on phones | — |
| `--sig-space-20` | `20px` | card padding | — |
| `--sig-space-24` | `24px` | text gutter, band side padding | — |
| `--sig-space-32` | `32px` | gap before the full-width action | — |
| `--sig-space-40` | `40px` | section gap | — |

#### Radii

| Token | Value | Role | Dark |
|---|---|---|---|
| `--sig-radius-control` | `16px` | full-width action button (review proposes 14: decision) | — |
| `--sig-radius-field` | `10px` | input box on desktop sign-in | — |
| `--sig-radius-tile` | `13px` | 42px icon tile | — |
| `--sig-radius-list` | `18px` | list group, alert, quiet card | — |
| `--sig-radius-card` | `22px` | card, field group, shift card | — |
| `--sig-radius-band` | `24px` | band as a rounded panel at 768+ | — |
| `--sig-radius-sheet` | `28px` | sheet top corners, More sheet | — |
| `--sig-radius-pill` | `999px` | pills, chips, band link | — |

#### Elevation

| Token | Value | Role | Dark |
|---|---|---|---|
| `--sig-shadow-card-lift` | `0 1px 1px rgba(22, 28, 27, .03), 0 2px 6px rgba(22, 28, 27, .03), 0 16px 36px -22px rgba(13, 54, 52, .24)` | card lift without the edge (= --sg-card-shadow) | — |
| `--sig-shadow-card` | `inset 0 0 0 1px rgba(22, 28, 27, .06), var(--sig-shadow-card-lift)` | employee card: 6% ink edge plus lift | — |
| `--sig-shadow-raised` | `0 0 0 1px var(--sig-edge), 0 14px 30px -22px rgba(13, 54, 52, .32)` | raised card with a solid edge (Clocker) | — |
| `--sig-shadow-sheet` | `0 -10px 40px rgba(10, 22, 21, .18)` | bottom sheet | — |
| `--sig-shadow-dialog` | `0 30px 80px rgba(9, 22, 21, .35)` | floating dialog | — |

#### Motion

| Token | Value | Role | Dark |
|---|---|---|---|
| `--sig-dur-press` | `120ms` | press / tap feedback | — |
| `--sig-dur-state` | `180ms` | state change (check, dot, cross-fade) | — |
| `--sig-dur-sheet` | `280ms` | new: not yet used; sheet rise / route change (review gap 13) | — |
| `--sig-dur-rise` | `360ms` | page entrance rise | — |
| `--sig-ease` | `cubic-bezier(.2, .7, .2, 1)` | standard ease-out | — |

#### Press & focus

| Token | Value | Role | Dark |
|---|---|---|---|
| `--sig-press-bg` | `#F3F2EF` | row pressed (Home rows only today; elsewhere new: not yet used) | — |
| `--sig-hover-bg` | `#FAFAF8` | row hover | — |
| `--sig-press-scale` | `.98` | button pressed | — |
| `--sig-focus` | `#161C1B` | focus ring on light surfaces; 17.27 white / 15.98 page | — |
| `--sig-focus-on-dark` | `#FFFFFF` | focus ring on the band; 13.17 on deep (mint #A9E2DA would be 9.14) | — |
| `--sig-focus-width` | `2px` | signature.module.css:17 | — |
| `--sig-focus-offset` | `2px` | signature.module.css:17 | — |

#### Texture

| Token | Value | Role | Dark |
|---|---|---|---|
| `--sig-grain` | `SVG fractal-noise tile (160px), see tokens.css` | band grain, byte-identical to --sg-grain | — |
| `--sig-grain-opacity` | `.07` | grain layer opacity (mix-blend-mode: overlay) | — |

#### Aliases (compatibility only; prefer the names above)

| Token | Value | Role | Dark |
|---|---|---|---|
| `--sig-ink` | `var(--sig-ink-1)` | alias of --sig-ink-1 | — |
| `--sig-teal` | `var(--sig-action)` | alias of --sig-action | — |
| `--sig-paper` | `var(--sig-card)` | alias of --sig-card | — |
| `--sig-frame` | `var(--sig-track)` | alias of --sig-track | — |
| `--sig-display` | `var(--sig-font-display)` | alias of --sig-font-display | — |
| `--sig-amber` | `var(--sig-review-ink)` | alias of --sig-review-ink | — |
| `--sig-red` | `var(--sig-urgent-ink)` | alias of --sig-urgent-ink | — |

---

## 4. Type

### 4.1 Typefaces today

| Surface | Family | Where |
|---|---|---|
| Employee app | System stack: `-apple-system, BlinkMacSystemFont, "SF Pro Text"/"SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", sans-serif` | `employee-style.css:75`, `signature.module.css:8-9` |
| Sign-in, activation | Same system stack (`--sys`, `--display`) | `auth-premium.css:10`, `auth-signature.css:6` |
| Clocker | Bundled Inter variable, named "Nevora Clocker" | `clocker-shell.module.css:1`, `/fonts/clocker/inter-variable.ttf` |
| Clocker PIN setup | Bundled Inter variable | `clocker-pin.module.css:1-7` |

Text-face roles use "SF Pro Text" first; display roles use "SF Pro Display" first. Which family wins is a decision for
Jose (section 11). Nothing changes until he decides.

### 4.2 Type roles

Values are as built. Sizes are in rem, so the reader's text size applies (1rem = 16px at default). "Display" means the
display stack; everything else uses the text stack.

| Role | Token (`--sig-type-*` / `--sig-tracking-*`) | Size / line | Weight | Tracking | Family | Built in |
|---|---|---|---|---|---|---|
| Hero word (band) | `hero-word` | 46 / 50 | 300 | -.04em | display | `.sg-word` |
| Hero figure (band date) | `hero-figure` | 60 / 62 | 200 | -.045em, tabular | display | `.sg-date` |
| Hero figure (band duration) | `hero-duration` | 54 / 56 | 200 | -.04em, tabular | display | `.sgDurHero` |
| Headline (band, two lines) | `headline` | 40 / 44 | 300 | -.035em | display | `.sg-head2` |
| Page title on Home, Schedule and Requests bands | none (conflict T1, Decision D7) | 40 / 44 (44 / 48 at ≥1024 on Home) | 400 | -.035em | display | `.h5Band h1`, `.s6Band h1`, `.r6Band h1` |
| Ticket figure (card) | `figure-ticket` | 56 / 54 (46 / 46 under 360px) | 200 | -.045em, tabular | display | `.sg-ticket b` |
| Day number in rows | `figure-day` | 28 / 30 | 300 | -.03em, tabular | display | `.sg-day strong` |
| Time figure in rows | none yet | 21 / 26 | 300 | -.02em, tabular | display | `.sg-time` |
| Row title | `row` | 17 / 22 | 500 | -.012em | text | `.sg-copy > b`, `.sg-t1 > b`, `.sgLinkRow b` |
| Row second line | `row-sub` | 15 / 20 | 400 | 0 | text | `.sg-copy > span` |
| Body | `body` | 16 / 22 | 400 | 0 | text | `.sg-sub`, Home `.h5Where` |
| Body (kit preset) | `--nv-t-body` | 17 / 24 phones, 16 / 24 at ≥768 | 400 | 0 | text | `employee-style.css:85` |
| Callout (notes, empty, quiet lines) | `callout` | **15** / 21 | 400 | 0 | text | `.sg-note`, `.sg-empty`, `.sg-quiet` |
| Link | `link` | 15 / 20 | 500 | 0 | text | `.sg-link` |
| Full-width button | `button` | 17 / 1 | 500 | 0 | text | `.sg-cta` |
| Status pill | `pill` | 13 / 1 | 500 | .01em | text | `.sg-pill` |
| Caps label (section head, eyebrow) | `caps` | **12** / 16 | 600 | .13em, uppercase | text | `.sgHead h2`, `.sg-h h2`, `.sgEyebrow` |
| Small caps (today; to retire) | `caps-sm` | 11 / 14 | 600 | .12em, uppercase | text | `.sg-day small`, `.sg-ticket small`, `.sg-pair dt` |
| Tab label | `tab` | **13** / 16 declared; may render at 12 (T12, not browser-verified) | 500 (600 when active) | 0 | text | `--nv-t-tab` |

Use a role as `font: var(--sig-type-<role>); letter-spacing: var(--sig-tracking-<role>);`. Figures add
`font-variant-numeric: tabular-nums`. Caps add `text-transform: uppercase`.

Tracked caps at **11px** are still built in these places, below the 12px exception in section 9.2:
`.sg-pair dt`, `.sg-day small`, `.sg-ticket small`, `.h5Day small`, `.h5Stats dt`, the phone field label `.ap-form
.ap-label` (`auth-signature.css:49`), the Clocker location on phones (`clocker-shell.module.css`, `.location` at
`.6875rem`) and the Alerts example label (`employee-style.css:245`). The Clocker wordmark's "Workforce" line is 10px;
it is part of the brand lockup, not a label, but it is still listed for Jose.

### 4.3 Display weight: decision, not a mandate

Weight **200** is built today in:

- `.sg-date`, `.sgDurHero`, `.sg-ticket b` (`signature.module.css:30, 38, 131`);
- `.ap-band__greet` (`auth-signature.css:33`) and `.act-id__value` (`activation.css:67`);
- the Clocker clock (`clocker-shell.module.css:75`);
- `.ss404` and `.nf-404`, `.tcDash`, `.ccCount b`, `.ccLockTime b`, `.ctHalf b`, and `.toHero` (forced with `!important`).

The review (gap 3) recommends a **300 floor** for display weight and light figures only at 40px and above. Weight 200
maps to different cuts on SF, Roboto and Segoe UI, so it looks thinner on iPhone and blurrier on Android and Windows.
TEAM-RULES lists ultra-light fonts under "Avoid".

This is **Decision D2 for Jose**. Today's 200 stays until he decides. If he picks 300, it is a visual change and needs
its own before/after screenshots.

---

## 5. Layout

### 5.1 The band

- **Colour:** deep `#0D3634` (`--sig-deep`).
- **Λ mark:** an SVG pinned bottom-right, behind the content. The large stroke fills `#164B48` (`--sig-mark`); the small
  triangle fills sky `#35B6EC` (`--sig-sky`). Width 280px on the shared frame, 330px on Home, 300px on Schedule and
  Requests; offset about -90px right, -6px bottom. The Clocker mark is 420px at 55% opacity.
- **Grain:** a 160px SVG fractal-noise tile (`--sig-grain`) at 7% opacity, `mix-blend-mode: overlay`. The sign-in
  panel uses its own heavier grain (180px tile, 55% opacity); see conflicts.
- **Padding on phones:** 22 / 24 / 62 on the shared frame (`.sgBand`); 18 / 24 / 58 on Home, Schedule and Requests.
  The 62 or 58 bottom leaves room for the sheet's 30px overlap. (Gap 9: one padding for all bands is a target.)
- **Text on the band:** white for the hero; eyebrow white at 62%; supporting line white at 72–74%; mint `#A9E2DA` for
  emphasis inside a line (`.sg-sub b`, `.sg-head2 em`).
- **Phone header:** the shell header is the same deep colour, so header and band read as one surface. 64px tall, a 40px
  soft-white avatar on the left, "+" and the bell as 44px targets on the right (`employee-style.css:16-46`).
- **Section tabs on phones** (Requests and Pay groups) sit on the deep band: white at 66%, current tab white with a 2px
  mint underline.

### 5.2 The sheet

- **Colour:** soft white `#F7F6F3` (`--sig-page`). Jose chose soft white over ivory on October 20.
- **Shape on phones:** rises over the band with `margin-top: -30px`, `padding-top: 26px` and **28px top corners**
  (`border-radius: 28px 28px 0 0`). The route skeletons and the Clocker phone layout use the same overlap (Clocker:
  -28px).
- **Sections:** a tracked-caps heading 24px from the edge, then cards inset 16px from the edge. Section gap 40px,
  heading to card 14px, card padding 20px, row height 76px (`signature.module.css:90-96`).

### 5.3 Widths and desktop

| Width | Shared frame, Schedule, Requests | Home | Sign-in | Clocker |
|---|---|---|---|---|
| < 360 | container query tightens rows and tickets (`@container sg (max-width: 359px)`) | hours scale with `cqi` | sheet padding 20, title 32/36 | clock 52px, side padding 20 |
| < 768 | full width, band + overlapping sheet | same | band + cream sheet | < 700: band on top, sheet below |
| ≥ 768 | column `min(100%, 760px)`, centred, padding 16 / 24 / 48; band becomes a rounded panel (24px radius, padding 28 / 32 / 34); sheet flattens (no overlap, no radius, no fill) | column `min(100%, 720px)` | split layout: form column + deep panel (40% at 768–1023) | ≥ 701: deep side `clamp(320px, 35vw, 500px)` + task column (max 520px) |
| ≥ 1024 | same 760px column | column `min(100%, 1120px)`, two columns with a 32px gap; band shows two stats | 47 / 53 split | same |

Columns are centred with `margin: 0 auto`. The desktop and tablet shell around the column (sidebar, breadcrumb) is
still the older portal shell; that seam is review gap 7 and is not part of this spec's "built" state.

### 5.4 Safe areas

- Clocker: the side and task padding use `env(safe-area-inset-*)` on every edge.
- Sign-in: the phone band height and its controls include `env(safe-area-inset-top)`; the sheet's bottom padding adds
  `env(safe-area-inset-bottom)`.
- Employee app: the More sheet adds `env(safe-area-inset-bottom)` (`employee-style.css:197`). The phone header and tab
  bar take their insets from the shared shell; that was checked on the iOS simulator in the U-series (DESIGN.MD,
  "Owed testing"), not re-checked for Signature.

---

## 6. Components

Status: **Built** = in code today. **Target** = agreed, not built. The parallel `sig-components` session is building
the press feedback, the button scale, the pending look and the band focus ring; until it lands, the "Built" column is
what users see.

### 6.1 Cards

- **Built (`.sg-card`):** white, **22px** radius, a 1px inset edge in ink at 6% plus a three-layer soft shadow
  (`--sg-card-shadow`). Cards stack with 12px between them. Head 18 / 20 padding, body 0 / 20 / 20, footer at least
  52px with a hairline on top.
- **Tones:** `tint` (`#EAF4F2`, no shadow) and `amber` (`#FBF4EA` with a `#F2E4CD` inset edge).
- **Older lists (`.sg-list`, `.h5List`, `.r6List`):** white, 18px radius, a real 1px `#E8E5DF` border, no shadow.
  Home's shift card (`.h5Card`) is 22px with the same real border.
- **Clocker and activation cards:** a real 1px `#E3DFD8` edge plus one soft shadow (`--ck-lift`, `--act-lift`).
- **Rule:** the 6% inset edge measures 1.05:1 on the page, so the shadow alone separates the card. Keep a real 1px
  `--sig-rule` edge as the fallback when shadows are off (forced colours, print, a future dark mode). **Target:** add
  that fallback under `@media (forced-colors: active)` and in dark mode.

### 6.2 Lists and rows

| Row | Min height | Padding | Divider | Built in |
|---|---|---|---|---|
| Card row `.sg-r` | 76 | 16 / 20 (14 / 16 under 360) | hairline from 78px (70 under 360) | `signature.module.css:117` |
| List row `.sg-row` | 72 | 14 / 16 / 14 / 18 | hairline from 18px | `:54` |
| Link row `.sgLinkRow` | 68 | 12 / 16 / 12 / 18 | — | `:72` |
| Home row `.h5Row` | 72 | 14 / 18 | hairline | `employee-home-today.module.css` |
| More sheet row | 58 | 0 / 16 / 0 / 18 | hairline from 18px | `employee-style.css:207` |

Row content: an optional leading tile or day block, a title (row role, ink-1), one secondary line (callout, ink-2), and
a trailing chevron in `--sig-faint` or a status pill. Hover is `#FAFAF8`. Signature still draws its own chevron
(`SigChevron`); gap 14 replaces it with Phosphor `CaretRight` (target).

### 6.3 Tiles

`.sg-tile`: 42 × 42, 13px radius, teal-wash `#E8F2EF` with a deep glyph. Tones: amber (`#F8EAD5`, amber glyph) and
white (white, teal glyph). Used in card heads and, as a target, in empty states (gap 12).

### 6.4 Status pills

`.sg-pill` and `.nv-status` inside cards: 24px tall, 9px side padding, full radius, 13px weight 500, no icon.

| Tone | Wash | Ink | Contrast |
|---|---|---|---|
| Neutral (waiting, sent) | `#EFEDE8` | `#55585A` | 6.13:1 |
| Review (amber) | `#FBEFDC` | `#74440A` | 7.18:1 |
| Done / approved (teal today) | `#E2F1ED` | `#0A5753` | 7.21:1 |

There is no red pill. "Declined" and urgent words use red ink `#A3271A` as text. The board shows "Waiting",
"Approved" and "Declined" as tracked caps on the right of the row (`sig-requests.png`). Teal for "done" is Decision D1
(section 10).

### 6.5 Tickets

`.sg-ticket`: a two-sided card body (from / to) with a 48px round arrow between (40px under 360). Each side has a caps
label, a large light figure (section 4.2) and two short lines. An empty figure (`[data-empty]`) is drawn in
`--sig-faint` `#B9B6AF`, which is **2.02:1** on white and fails as text. **Target (gap 10):** show an em dash in
`--sig-ink-3`.

### 6.6 Fields and field groups (sign-in card)

- **Phones (built):** fields grouped in one white card with 22px outer corners, 6% ink inset edge, a hairline between
  fields. Each field: a caps label over the value, value at 17px, a 40px minimum box with no border. Focus draws a 2px
  ink ring around the box (`auth-signature.css:42-56`).
- **Wider screens (built):** separate fields, 52px tall (`3.25rem`), 1px `#8A8378` edge (3.75:1 on white), 10px radius,
  placeholder `#726E67` (5.07:1). Focus: ink edge plus a 4px deep wash ring.
- **Invalid:** auth uses `--danger` `#B42318`; activation uses `#A43836` with a white tile alert on `#FBEDEC`.
- **Target (review note 3):** a shared `SigField` and `SigFieldGroup` built on the phone card style, used by every
  employee form.

### 6.7 Buttons

**Built today, honestly:**

| Button | Height | Radius | Fill | Where |
|---|---|---|---|---|
| `.sg-primary` | 44 | full | deep | shared frame |
| `.sg-cta` | 54 | 16 | deep; disabled `#C9CFCD` with `#4E5654` text | shared frame |
| `.sg-cta[data-kind="ghost"]` | 54 | 16 | white, rule inset edge | shared frame |
| `.h5PrimaryButton`, `.r6Primary` | 52 | 10 | deep | Home, Requests |
| `.s6Primary` | 48 | 10 | deep | Schedule |
| `.ap-primary` | 52 (50 on phones) | 10 (16 on phones) | deep; hover `#0A2A28` | sign-in |
| `.act-submit`, `.act-go`, `.act-soft` | 56 | 16 | deep / white with lift | activation |
| Clocker `.button` | 60 | 18 | deep (`--clocker-accent`) | Clocker |
| Alerts sheet buttons | 46 | 14 | deep / white | `employee-style.css:253` |
| `.sg-band-link` | 44 | full | white at 10% on the band | band |
| `.sg-round` | 44 | circle | none, rule ring | rows |

Hover on deep fills is `#12423F` (shared frame) or `#164B48` (Clocker). While saving, `.sg-cta:disabled` turns grey
and reads "Saving…", which looks disabled or failed.

**Target (review gap 6; the `sig-components` session is normalising this now):**

- Primary: 52px tall with a 14px radius on phones, 44px on desktop, deep fill, white label. The token
  `--sig-radius-control` holds today's 16px; 14px is Decision D6.
- Secondary: an outline at the same size.
- Text link: section 6.8.
- Pill shapes only for chips and the band link.
- Pending keeps the deep fill, shows a 16px Phosphor `CircleNotch` spinner (static under reduced motion) and sets
  `aria-busy`.

### 6.8 Links

Built: links are **ink, not teal**. `.sg-link` is 15px weight 500, underlined in the rule colour (1px, 5px offset), and
the underline turns ink on hover. Minimum target 44px. Sign-in links (`.ap-link`) are the same with a 3px offset.
Disabled links turn `--sig-ink-3`. See section 10 for what teal is used for.

### 6.9 States

| State | Built | Target |
|---|---|---|
| **Loading** | Route skeletons per route (`employee-style.css:62-194`): the band with white-at-12% bars, then white cards on the overlapping sheet. No shimmer. Activation: `act-skel` bars `#ECE9E3` and a 16px spinner (static under reduced motion). Evidence: `build-home/state-loading.png`. | A 1.2s opacity pulse, off under reduced motion. Skeleton heights match the loaded page so nothing jumps. |
| **Empty** | `.sg-empty`: one centred 15px sentence in ink-3 inside the card. `.r6Empty`: a card with a bold first line. Evidence: `build-home/state-noshifts.png`. | Gap 12: a 42px tile with a Phosphor icon, a 17px title, one line in ink-2 and at most one action. No illustration. |
| **Error** | `SignatureError` and `SignatureNotFound` (`system-state.tsx`): the band frame, an amber-glyph orb (`#F4C98A`), plain words, one action. 404 figure at weight 200 in mint. Auth: `.ap-alert[data-tone="error"]`. Evidence: `build-home/state-error.png`. | A no-access variant of `SignatureError` (gap 8). |
| **Offline** | Per page only. The Home offline line is in `build-home/state-offline.png`; the board is `phase-4/p4b-offline-320.png` (not yet in the repo, section 15). No shared banner. | Gap 8: one connection banner under the header (offline, reconnecting, back online). |
| **Signed out / session ended** | Per page ("Your session ended"). Evidence: `build-home/state-signedout.png`. | Gap 8: one sheet that offers sign-in again and keeps the draft. |
| **Success** | Sign-in: `.ap-alert[data-tone="done"]` green `#1D6F42` on `#E7F4EC`. Activation: a deep seal with a teal-wash halo, then the Employee ID. Clocker: a recorded receipt. Employee app: the older Gusto toast (`toaster.tsx`), success and info only. | Gap 8: a Signature toast with success, info and error tones, an Undo slot and a 44px close. |

---

## 7. Focus and press

### 7.1 Focus

**Rule:**

- On light surfaces (page, card, sheet), focus is a 2px ring in `--sig-focus`, offset 2px (rows: inset -3px with the
  row's radius).
- On the band, the phone header, section tabs on the band, and anything else on `--sig-deep`, focus is a 2px ring in
  `--sig-focus-on-dark`: white (13.17:1 on the band) or mint (9.14:1). Never ink: ink on the band is **1.31:1**.
- This is the band's **default**, not a per-element override.

**Built today:** ink rings on light surfaces (`.sgRoot`, `.h5Root`, `.s6Root`, `.r6Root`, `.ap`). On the band only
`.sg-band-link`, the phone header buttons, section tabs and the sign-in pill and EN/ES switch switch to white. Every
other element on a band inherits the ink ring and fails WCAG 2.4.7 and 2.4.11. The Clocker uses a 3px `#0B6E69` ring,
offset 3px (5.63:1 on the page).

The `sig-components` session is making `--sig-focus-on-dark` the band default.

### 7.2 Press feedback

**Rule (target):**

- Rows and list items: background `--sig-press-bg` (`#F3F2EF`, Home's pressed row today) while pressed.
- Buttons: `transform: scale(var(--sig-press-scale))` (.98) plus the darker fill.
- Both within 80–100ms. The token `--sig-dur-press` records today's 120ms (sign-in); moving it to 80–100ms (the review
  says 90ms) is part of Decision D8.
- Under `prefers-reduced-motion: reduce`: no transform; the background change may stay.

**Built today:** `.h5Row:active` (`#F3F2EF`) and `.h5Action:active` (ink at 5%) on Home; Clocker buttons scale .98 over
160ms; `.ap-primary` scales .96 over 120ms. The shared frame (`.sg-r`, `.sg-row`, `.sgLinkRow`, `.sg-cta`,
`.sg-primary`, `.sg-round`, `.sg-band-link`), the tab bar and the More sheet have no pressed state, and
`globals.css:76` turns off the tap highlight. The `sig-components` session implements the rule above.

---

## 8. Motion

| Token | Value today | Use | Note |
|---|---|---|---|
| `--sig-dur-press` | 120ms | press feedback | review target 90ms (D8) |
| `--sig-dur-state` | 180ms | colour and state changes | from activation |
| `--sig-dur-sheet` | 280ms | sheets and route rise | new, not used yet |
| `--sig-dur-rise` | 360ms | page entrance rise | from sign-in |
| `--sig-ease` | `cubic-bezier(.2, .7, .2, 1)` | all of the above | from sign-in |

Built: sign-in rises over 360ms on that curve (`auth-premium.css:26`); the activation rule dots change over 180ms; the
Clocker fades in with GSAP over 240ms. The shared frame and `employee-style.css` have no motion. Every animated rule
needs a `prefers-reduced-motion: reduce` version (opacity only or none).

---

## 9. Accessibility floors

### 9.1 Text size

- **Phones:** body and callout text at least **15px**. Row titles 17px.
- **200% text:** sizes are rem, so they scale. At 200% the band hero fills the first screen and section tabs clip
  (`build-requests/_app_requests_hub-chromium-390-200.png`, `build-schedule/_app_schedule-chromium-390-200.png`).
  Target (gap 16): cap hero size with `min(…, 12vw)`, first name only in greetings, `text-wrap: balance`,
  `hyphens: manual`, and an edge fade on scrolling tab rows.

### 9.2 The caps-label exception

Tracked uppercase labels may go below the 15px floor only under all of these conditions:

- at least **12px**;
- weight **600**;
- contrast at least **4.5:1** on their real background;
- **never the only carrier of meaning** (the same fact is in a nearby word, figure or accessible name).

The 11px caps listed in section 4.2 must rise to 12px. That is a visual change and belongs to the components session.

### 9.3 Targets

At least **44 × 44px** for every control. Rows are 68–76px, the CTA 54px, round buttons and band links 44px. The older
toast close button is 32px (gap 8). `.ap-aside-link` stretches its hit area with an `::after` inset; a shared utility
for that is a target.

### 9.4 Reduced motion

Every transition and animation has a reduced-motion version. Built for sign-in, activation, Clocker and Home's
disclosure. Six animated files still lack one (gap 13).

### 9.5 Contrast, measured

WCAG 2.x formula. Translucent colours were blended over their real background first (white at x% over `#0D3634`).
Script: `<scratchpad>/spec/contrast.py` (not in the repo).

**Text (needs 4.5:1; 3:1 for text 24px and up or 19px bold and up):**

| Foreground | Background | Ratio | Result |
|---|---|---|---|
| ink-1 `#161C1B` | page `#F7F6F3` | 15.98 | pass |
| ink-1 `#161C1B` | card `#FFFFFF` | 17.27 | pass |
| ink-2 `#5F625E` | page | 5.72 | pass |
| ink-2 `#5F625E` | card | 6.19 | pass |
| ink-3 `#6F6C66` | page | 4.84 | pass |
| ink-3 `#6F6C66` | card | 5.23 | pass |
| faint `#B9B6AF` | card | **2.02** | **fails** (empty ticket figure) |
| faint `#B9B6AF` | page | **1.87** | decorative only |
| action `#0B6E69` | card | 6.09 | pass |
| action `#0B6E69` | page | 5.63 | pass |
| action `#0B6E69` | action wash `#E3F0EC` | 5.20 | pass |
| white | deep `#0D3634` | 13.17 | pass |
| white | deep hover `#12423F` | 11.19 | pass |
| mint `#A9E2DA` | deep | 9.14 | pass |
| white 74% (`.sg-sub`) | deep | 7.93 | pass |
| white 72% (summaries) | deep | 7.59 | pass |
| white 66% (section tabs) | deep | 6.64 | pass |
| white 62% (eyebrow) | deep | 6.05 | pass |
| white 60% (`.sg-pair dt`) | deep | 5.77 | pass |
| white 55% (`.h5Stats dt`) | deep | 5.11 | pass |
| white 50% (Clocker "powered by", 12px) | deep | **4.45** | **fails** by a hair |
| done pill `#0A5753` | `#E2F1ED` | 7.21 | pass |
| review pill `#74440A` | `#FBEFDC` | 7.18 | pass |
| neutral pill `#55585A` | `#EFEDE8` | 6.13 | pass |
| urgent `#A3271A` | card | 7.34 | pass |
| urgent `#A3271A` | page | 6.79 | pass |
| amber `#8A5208` | page | 5.90 | pass |
| amber `#8A5208` | `#FDF8F1` (card footer) | 6.04 | pass |
| auth done `#1D6F42` | `#E7F4EC` | 5.45 | pass |
| auth danger `#B42318` | `#FDECEC` | 5.76 | pass |
| activation alert `#8F2D2B` | `#FBEDEC` | 7.15 | pass |
| disabled CTA `#4E5654` | `#C9CFCD` | 4.78 | pass |
| Clocker disabled `#5F625E` | `#E3E0D9` | 4.69 | pass |
| placeholder `#726E67` | card | 5.07 | pass |
| tab bar inactive ink-3 | tab bar (96% page on white) | 4.84 | pass |

**Non-text (needs 3:1 when it carries state or identifies a control):**

| Element | Against | Ratio | Result |
|---|---|---|---|
| focus ring ink | page | 15.98 | pass |
| focus ring ink | deep band | **1.31** | **fails** |
| focus ring white | deep band | 13.17 | pass |
| focus ring mint | deep band | 9.14 | pass |
| Clocker focus `#0B6E69` | page | 5.63 | pass |
| field edge `#8A8378` | card | 3.75 | pass |
| note dot `#B8892F` | page | 2.92 | fails; passes only because the word is also there |
| Clocker break dot `#C98A2E` | card | 2.93 | same |
| sky `#35B6EC` | deep | 5.68 | pass |
| card inset (ink 6%) | page | 1.05 | decorative; the shadow separates the card |
| rule `#E8E5DF` | card | 1.26 | decorative hairline |
| edge `#E3DFD8` | page | 1.23 | decorative |
| Λ mark `#164B48` | deep | 1.34 | decorative, by design |

---

## 10. Colour usage

### 10.1 Roles

- **Deep (`--sig-deep`, `#0D3634`)** is the brand surface: the band, the phone header, the More sheet's person card,
  and the **primary button fill**. White text on it.
- **Teal action (`--sig-action`, `#0B6E69`)** marks "act" and live attention: Home's "Scheduled now" kicker and dot,
  the white tile's glyph, the ticket arrow, activation's verified badge and "rule met" state, and the Clocker focus ring.
  The intended rule is that links and act affordances are teal. **Today, Signature links are ink with a rule-coloured
  underline (section 6.8), not teal.** Making links teal would be a visual change and is not part of this spec.
- **Mint (`--sig-mint`, `#A9E2DA`)** is emphasis on deep only: live dots, the current section-tab underline, emphasis in
  band lines, the 404 figure.
- **Sky (`--sig-sky`, `#35B6EC`)** is the mark's triangle and the unread dot. Never text.
- **Status colours** are only for status: section 3's `done`, `review`, `urgent` and `info` roles.

### 10.2 Today's "done" rule, and why it is a decision

Today the employee app shows **done / approved in teal**: the pill is `#0A5753` on `#E2F1ED`
(`signature.module.css:116`), the Clocker's "Spanish labels on" switch uses the same pair, and activation success is teal (the
`--act-teal` badge, the `--act-halo` `#E2F1ED` ring). This conflicts with two other rules:

1. Teal means "act". A teal "Approved" looks like something to press.
2. TEAM-RULES' status ladder says green is done. Manager shows done in green `#1E7B34`; sign-in shows success in green
   `#1D6F42` on `#E7F4EC`. A Lead sees a green "Approved" on Manager and a teal one on the employee side.

**DECISION FOR JOSE (D1):**

- **Option A, keep teal for done** on employee, activation and Clocker. Then record in TEAM-RULES that the Signature
  ladder is grey / amber / teal / red, and accept that Manager differs.
- **Option B, move done to green** like auth (`#1D6F42` on `#E7F4EC`) and Manager. Teal stays only for "act". This is a
  visual change on the employee pills, activation success and the Clocker.

The review recommends B. Nothing changes until Jose picks.

---

## 11. Typeface: decision

| Option | What it means |
|---|---|
| **A. System font everywhere** | Employee and sign-in stay as built. The Clocker and PIN move off Inter. TEAM-RULES changes "Inter for type" to "the platform's own font". |
| **B. Inter everywhere** | The bundled Inter variable (already in `/public/fonts`) replaces the system stack on employee and sign-in. Same rendering on iPhone, Android and Windows. |

Today: system stack on employee and sign-in; bundled Inter ("Nevora Clocker") on the Clocker and PIN. Both are recorded
in section 4.1. The review (gap 3) recommends **B, Inter everywhere**. **DECISION FOR JOSE (D3).** Nothing changes now.

---

## 12. Company branding (B1): decision

`src/lib/workspace-presentation/derive.ts` still derives `masthead` and `accent` (and eight more tokens) from a company's
seed colour. Signature ignores them: `employee-style.css`, `signature.module.css` and `auth-signature.css` do not read
the `--g-*` brand tokens. The Clocker lets a brand override its four `--clocker-*` accent tokens, and its comment says
"the deep-teal side stays NEVORA's". Manager hard-codes `--cm-tint #087571` over `--nv-accent`.

**DECISION FOR JOSE (D4):**

- **Option A, accent on buttons and links only.** A company's accent fills the primary button and colours links, within
  the B1 contrast floors. The band, header and mark stay NEVORA deep.
- **Option B, logo only.** Signature shows the company logo in a white chip; all colour stays NEVORA's.

Either way the band is never recoloured. Once decided, it is wired through `tokens.css`.

---

## 13. Icons

- Phosphor (`@phosphor-icons/react`), regular weight, `currentColor`, decorative icons hidden from assistive tech.
- Fill only for the active tab. **Built today:** the employee tab bar uses regular weight for every tab, active
  included (active = deep colour and a 600 label; `app-shell.tsx`, `NavIcon` default). The Manager tab bar uses fill for
  all tabs. Filling the employee active tab is a target.
- The Clocker uses `duotone` on action tiles and orbs (`clocker-punch-panel.tsx:137, 149, 161`, `clocker-setup.tsx:81`).
  Target (gap 14): regular.
- Sizes: target 16, 20, 24, 32, plus 44 on the Clocker.

---

## 14. Rules for pages

1. Follow the token rules in section 3.1: read `--sig-*`, never declare a palette, never extend the old prefixes.
2. No new `:not(#x)` specificity lifts in new code.
3. Each new screen cites its board path in a comment, and the board is in `docs/` before the code lands.
4. Each new screen covers loading, empty, error, offline and success (section 6.9), at 320, 390, 768 and 1440, with
   keyboard focus and reduced motion checked in a real browser.

---

## 15. Boards

### 15.1 In the repository (paths checked)

| Board | Path |
|---|---|
| The eight approved pages (Home, Schedule, Requests, Pay, My time, Notifications, Profile, More) | [`sig-board.png`](sig-board.png) |
| Tone study | [`tone-board.png`](tone-board.png) |
| Per page | [`sig-home.png`](sig-home.png), [`sig-home-320.png`](sig-home-320.png), [`sig-schedule.png`](sig-schedule.png), [`sig-schedule-320.png`](sig-schedule-320.png), [`sig-requests.png`](sig-requests.png), [`sig-pay.png`](sig-pay.png), [`sig-pay-320.png`](sig-pay-320.png), [`sig-mytime.png`](sig-mytime.png), [`sig-notifications.png`](sig-notifications.png), [`sig-profile.png`](sig-profile.png), [`sig-more.png`](sig-more.png) |
| Mock source | [`sig.css`](sig.css), the `sig-*.html` pages, [`up.css`](up.css) |
| Phase 1, approved round (My pay, My time, Timecards) | [`phase-1/p1c-board.png`](phase-1/p1c-board.png), [`phase-1/p1c-pay.png`](phase-1/p1c-pay.png), [`phase-1/p1c-mytime.png`](phase-1/p1c-mytime.png), [`phase-1/p1c-timecards.png`](phase-1/p1c-timecards.png), and each `-320.png` |
| Phase 1, earlier rounds | `phase-1/p1-*.png`, `phase-1/p1b-*.png` |
| Phase 2, approved round (More, Notifications, Profile) | [`phase-2/p2c-board.png`](phase-2/p2c-board.png), [`phase-2/p2c-more.png`](phase-2/p2c-more.png), [`phase-2/p2c-notifications.png`](phase-2/p2c-notifications.png), [`phase-2/p2c-profile.png`](phase-2/p2c-profile.png), and each `-320.png` |
| Phase 2, earlier rounds | `phase-2/p2-*.png`, `phase-2/p2b-*.png` |
| Build evidence, Home | [`build-home/`](build-home/): 320, 390, 768, 1440, 390 at 200%, WebKit, keyboard (`kb-2.png`, `kb-4.png`), and the states `state-loading`, `state-error`, `state-offline`, `state-noshifts`, `state-dayoff-allset`, `state-signedout` |
| Build evidence, Requests | [`build-requests/`](build-requests/): 320, 390, 1440, 390 at 200%, WebKit |
| Build evidence, Schedule | [`build-schedule/`](build-schedule/): 320, 390, 1440, 390 at 200%, WebKit, plus day, week, open, swap and conflict views |
| Sign-in E4 (the base Signature grew from) | [`../../auth-premium/png/BOARD-E4.png`](../../auth-premium/png/BOARD-E4.png), [`../../auth-premium/SPEC.md`](../../auth-premium/SPEC.md) |

### 15.2 Approved but not yet in the repository

The code cites these boards, and they exist only as **untracked** files in the main checkout
(`/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/specs/employee-style/signature/`). They need to be added to
`docs/` (review gap 1) before these links work:

| Board | Path in the main checkout | Cited by |
|---|---|---|
| Phase 3, approved round | `phase-3/p3c-board-a.png`, `-b.png`, `-c.png`, and the `p3c-*-320.png` pages | `signature.module.css:90`, `time-off-signature.tsx`, `shift-requests-signature.tsx`, `employee-updates.tsx` and others |
| Phase 4, approved round | `phase-4/p4b-board-a.png` to `-d.png`, and `p4b-*-320.png` (offline, error, 404, sign-in, activate, device, calendar, compose, corrections, review) | `auth-signature.css:1`, `employee-style.css:233`, `system-state.tsx`, `employee-home-today.module.css:193` |
| Activation v3 | `activation/v3/v3-board-a.png` to `-c.png`, `v3-details.png`, `v3/states/` | `activation.css:2`, `activation-invitation.tsx:78` |
| Clocker, approved c4 round | `clocker/c4-board-a.png` to `-d.png` | commit `b0632ce6`, `clocker-shell.module.css` |
| Build evidence | `phase-3/build/`, `phase-4/build/`, `activation/build-1/`, `clocker/build-1/` | the review |

---

## 16. Conflicts found during consolidation

These come from the token architect's notes (rows C1–C20, E1–E3, R1–R4, T1–T13, M1–M6, copied verbatim) plus what this spec found (S1–S8). Under the conflict rule, each local value keeps rendering; nothing here was changed. Rows marked **raw** sit in selector rules, which the token session does not edit.

The most important rows: **C2** (`/reset-access` still renders the pre-Signature ivory colours because it loads only `auth-premium.css`), **C18** ("done" text in the action teal), **T1** (band headline weight 400 vs 300), **T12** (tab label may render at 12px, not verified in a browser) and **C13** (Clocker footer text fails AA at 4.45:1).

### Colour

| # | File:line | Local name | Local value | Canonical | Canonical value | Renders today |
|---|---|---|---|---|---|---|
| C1 | clocker-shell.module.css:21 | `--ck-track` | `#E3E0D9` | `--sig-track` | `#EEECE7` | `#E3E0D9` on the Clocker: disabled primary button (clocker-shell:99, ink-2 text 4.69:1) and the countdown/working tracks (clocker-punch.module.css:64, :67) |
| C2 | auth-premium.css:6 | `--cream` / `--paper` / `--rule` / `--ink-3` | `#F4EFE7` / `#FFFDF9` / `#E2DACD` / `#6E6A63` | `--sig-page` / `--sig-card` / `--sig-rule` / `--sig-ink-3` | `#F7F6F3` / `#FFFFFF` / `#E8E5DF` / `#6F6C66` | auth-signature.css:6 overrides these to the canonical values on `/login`, `/activate` and `/forgot-access`. **`/reset-access` imports only auth-premium.css** (reset-access/page.tsx:6), so the old ivory values render there; auth-premium.css:247 also paints `html` `#F4EFE7` there |
| C3 | auth-premium.css:8 (fallback), globals.css:29-30 | `--danger` / `--danger-bg` | `#B42318` / `#FDECEC` | `--sig-urgent-ink` / `--sig-urgent-wash` | `#A3271A` / `#FBEDEC` | `#B42318` on `#FDECEC` (5.76:1) in sign-in error alerts and invalid field edges |
| C4 | auth-premium.css:9 (fallback), globals.css:25-26 | `--done` / `--done-bg` | `#1D6F42` / `#EAF5EA` (the `#E7F4EC` fallback never applies, because globals.css:26 defines `--color-state-success-bg`) | `--sig-done-ink` / `--sig-done-wash` | `#0A5753` / `#E2F1ED` | green on sign-in "done" alerts (auth-premium:99). This is the recorded green alternative (see Decisions) |
| C5 | activation.css:23, :31-34 | raw | `#A43836` (field edge, bad rule), `#F8E3E2` (halo), `#8F2D2B` (alert text), `#FBEDEC` (alert wash) | `--sig-urgent-ink` / `--sig-urgent-wash` | `#A3271A` / `#FBEDEC` | activation errors in `#A43836` / `#8F2D2B`. The wash matches canonical |
| C6 | signature.module.css:115 | raw (`.sg-pill[data-tone=amber]`) | text `#74440A` | `--sig-review-ink` | `#8A5208` | `#74440A` on `#FBEFDC` (7.18:1) on employee amber pills. The wash matches canonical |
| C7 | signature.module.css:64, :137; request-hub.module.css:31 | raw hover | `#12423F` | `--sig-deep-hover` | `#12423F` | no conflict (listed for contrast). Conflicting hovers: **auth-premium.css:75 `#0A2A28`** and **clocker-shell.module.css:7 `--clocker-accent-hover #164B48`** (= `--sig-mark`). Each renders on its own surface |
| C8 | clocker-shell.module.css:8, :105 | `--clocker-focus` | `#0B6E69`, 3px ring, offset 3px | `--sig-focus` / `--sig-focus-width` / `--sig-focus-offset` | `#161C1B`, 2px, 2px | teal 3px/3px on the Clocker (6.09:1 on white) |
| C9 | auth-premium.css:126 | raw | ink ring, offset **3px**, radius 6px | `--sig-focus-offset` | `2px` | 3px offset on sign-in. `.ap-box:focus-within` (auth-premium:55) uses its own ring `#1E2725` plus a 4px 8% deep halo; phone fields (auth-signature:51) use a 2px ink box-shadow |
| C10 | employee-style.css:236 | raw backdrop | `rgba(9, 22, 21, .44)` | `--sig-scrim` | `rgba(10, 22, 21, .38)` | `.44` behind the alerts-on-this-device dialog, `.38` behind the More sheet (employee-style:199) |
| C11 | employee-home-today.module.css:34; employee-my-schedule.module.css:27; request-hub.module.css:25; auth-signature.css:34 | raw | band sub-line `rgba(255, 255, 255, .72)` (7.59:1) | `--sig-on-deep-2` | `rgba(255, 255, 255, .74)` (7.93:1) | `.72` on Home, Schedule, Requests and the sign-in band; `.74` on every `SigBand` page (signature:31) |
| C12 | employee-home-today.module.css:200 | raw | stat label `rgba(255, 255, 255, .55)` | `--sig-on-deep-3` | `rgba(255, 255, 255, .62)` | `.55` (5.11:1) on desktop Home stats |
| C13 | clocker-shell.module.css:84 | raw | `.powered` `rgba(255, 255, 255, .5)` | `--sig-on-deep-3` | `.62` | `.5`, which is **4.45:1 at 12px and fails AA** (a11y note, not changed) |
| C14 | signature.module.css:102, :110; auth-signature.css:20 | raw washes | `#EAF4F2` (tint card), `#E8F2EF` (tile, Face ID halo) | `--sig-action-wash` | `#E3F0EC` | near-duplicate teal washes, each on its own element. Do not map without a decision |
| C15 | signature.module.css:103, :108, :111 | raw | amber card `#FBF4EA`, amber foot `#FDF8F1`, amber tile `#F8EAD5` | `--sig-review-wash` | `#FBEFDC` | near-duplicate amber washes. The canonical wash is the pill / Clocker / activation-warn value |
| C16 | employee-my-schedule.module.css:92 | raw | selected row `#FBFAF8` | `--sig-hover-bg` | `#FAFAF8` | near-duplicate, 1 unit off |
| C17 | employee-home-today.module.css:104; employee-my-schedule.module.css:57; auth-premium.css:65 | raw | press/hover `rgba(22, 28, 27, .05)` | `--sig-press-bg` | `#F3F2EF` (employee-home-today:111) | two press looks on Home: rows `#F3F2EF`, the "View all" action and strip days 5% ink (≈ `#F3F4F4` on white) |
| C18 | employee-my-schedule.module.css:69, :75, :77; request-hub.module.css:49 (`.r6Good`); activation.css:8, :29 | `--s6-teal` / `--r6-teal` / `--act-teal` used as "done" text | `#0B6E69` | `--sig-done-ink` | `#0A5753` | **role conflict**: confirmed / approved / ok text renders in the action ink `#0B6E69` (5.23:1 on the done wash, 6.09:1 on white), while the done pill uses `#0A5753` |
| C19 | clocker-shell.module.css:121 | raw | selected language chip `#E2F1ED` / `#0A5753` | `--sig-done-*` | same values | values match but the role is "selected", not "done". Map to the done tokens only if Jose accepts that |
| C20 | profile-premium.css:15 | raw | avatar `#F4EFE7` bg with `#0D3634` text | `--sig-page` | `#F7F6F3` | old ivory on the profile avatar |

### Raw `#0D3634` in selector rules (report only, not edited)

`profile-premium.css:15` (avatar initials), `:56` (setting-row icon), `:67` (language-button focus ring); `not-found.css:4` (`.nf-band` background), `:14` (`.nf-cta` background). All equal `--sig-deep`, so swapping them would change nothing. Other raw deep-family values: employee-style.css:43 `#1A4744` (unread-dot ring), :242 gradient `#2B6E69 → #12403D → #0B2725`; auth-signature.css:20 `#1B5A56`.

### Elevation and radii

| # | File:line | Local | Local value | Canonical | Canonical value | Renders today |
|---|---|---|---|---|---|---|
| E1 | activation.css:4 | `--act-lift` | `0 0 0 1px var(--act-edge), 0 14px 30px -24px rgba(13, 54, 52, .32)` | `--sig-shadow-raised` | `… -22px …` | `-24px` on activation's secondary button and ID card. clocker-setup.module.css:92 also uses `-24px` at `.28` alpha |
| E2 | auth-signature.css:16 | raw (`.ap-fid`) | `inset 0 0 0 1px rgba(22,28,27,.06), 0 18px 36px -24px rgba(13,54,52,.3)` | `--sig-shadow-card` | the `.sg-card` stack | its own single-layer lift on the Face ID card |
| E3 | employee-home-today.module.css:42 | raw (`.h5Card`) | `1px solid var(--h5-rule)` border, no shadow | `--sig-shadow-card` | inset + lift | Home's shift card is flat with a hairline, while `SigCard` pages are lifted |
| R1 | employee-home-today.module.css:155; employee-my-schedule.module.css:71, :114; request-hub.module.css:29; auth-premium.css:52, :72, :80 | raw | button radius `10px` | `--sig-radius-control` | `16px` | 10px on the Home/Schedule/Requests primary buttons and desktop sign-in; 16px on `.sg-cta`, phone sign-in, activation and not-found. The review proposes 14 |
| R2 | employee-style.css:253 | raw | dialog buttons `14px` | `--sig-radius-control` | `16px` | 14px |
| R3 | clocker-shell.module.css:95 | raw | kiosk `.button` `18px`, 60px tall | `--sig-radius-control` | `16px` | 18px on the Clocker |
| R4 | activation.css:65 | raw | ID card `20px` | `--sig-radius-card` | `22px` | 20px (also clocker-pin:122, clocker-setup:23/92/99) |

### Type

| # | File:line | Local | Local value | Canonical | Canonical value | Renders today |
|---|---|---|---|---|---|---|
| T1 | employee-home-today.module.css:29; employee-my-schedule.module.css:26; request-hub.module.css:24 | `.h5/.s6/.r6Band h1` | `400 2.5rem/2.75rem`, -.035em (44/48 at 768+/1024+) | `--sig-type-headline` | `300 2.5rem/2.75rem` | weight **400** on Home, Schedule and Requests, 300 on `SigBand` pages (review gap 9). Band padding also differs: 18/24/58 there, 22/24/62 at signature:20 (not tokenised) |
| T2 | auth-signature.css:33 | `.ap-band__greet` | `200 2.875rem/3.125rem` | `--sig-type-hero-word` | `300 …` | weight **200** for the phone sign-in greeting |
| T3 | signature.module.css:36, :130 | `.sg-pair dt` / `.sg-ticket small` | 11px caps at **.13em** / **.14em** | `--sig-tracking-caps-sm` | `.12em` | three trackings for the same 11px caps |
| T4 | auth-signature.css:24 | `.ap-or--lead` | `500 .75rem/1rem`, .08em | `--sig-type-caps` | `600 …`, .13em | lighter, tighter caps on sign-in |
| T5 | activation.css:66 | `.act-id__label` | `600 .75rem/1.3`, .14em | `--sig-type-caps` | `600 .75rem/1rem`, .13em | |
| T6 | auth-premium.css:29, :136 | `.ap-eyebrow`, `.ap-panel__eyebrow` | 13px caps, tracking `1.4px` / `1.2px` (px, not em) | `--sig-type-caps` | 12px, .13em | desktop sign-in |
| T7 | clocker-shell.module.css:67, :71 | wordmark sub, location | 10px .24em / 12px .12em, at .62 / .86 white | `--sig-type-caps*` | | Clocker's own caps |
| T8 | employee-style.css:75 | `--nv-font` | `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", …` | `--sig-font` | no `"SF Pro Display"` | the employee shell text stack. On Apple `-apple-system` resolves first, so this is very likely invisible, but it is not provably identical |
| T9 | auth-premium.css:10 | `--sys` | `… "Helvetica Neue", Arial, sans-serif` | `--sig-font` | no `Arial` | only differs where no system face exists |
| T10 | employee-style.css:238, :243-:250 | `var(--e5-font, inherit)` | `--e5-font` is never declared, so it resolves to `inherit` (= `--nv-font`) | `--sig-font` | | the alerts dialog inherits `--nv-font` |
| T11 | employee-home-today.module.css:200-202 | `.h5Stats` | `var(--sg-font, -apple-system, sans-serif)` (`--sg-font` is not in scope on Home, so it falls back); two inline stacks | `--sig-font` / `--sig-font-display` | | shortened fallback stacks on desktop Home stats |
| T12 | employee-style.css:90 vs portal-gusto.css:346 | `--nv-t-tab` | 13/16 declared; `.mobile-nav-link` gets `min(0.75rem, 13px)` = 12px from portal-gusto | `--sig-type-tab` | `500 .8125rem/1rem` | **not verified**: the tab-bar label may render at 12px. Check in a browser before migrating |
| T13 | signature.module.css:57 vs :58 | row sub-line vs callout | 15/**20** vs 15/**21** | `--sig-type-row-sub` / `--sig-type-callout` | | two 15px line-heights kept as two roles; `--nv-t-callout` is 15/20 |

### Motion and press

| # | File:line | Local | Local value | Canonical | Canonical value | Renders today |
|---|---|---|---|---|---|---|
| M1 | clocker-shell.module.css:95 | `.button` transition | `.16s ease` | `--sig-dur-press` + `--sig-ease` | `120ms`, `cubic-bezier(.2,.7,.2,1)` | 160ms ease on the Clocker |
| M2 | auth-premium.css:53, :73 | transitions | `120ms ease` | `--sig-ease` | the cubic-bezier | duration matches, easing is plain `ease` |
| M3 | employee-home-today.module.css:139; employee-my-schedule.module.css:153, :166, :179; request-hub.module.css:60 | chevron rotate | `.2s ease` | `--sig-dur-state` + `--sig-ease` | `180ms`, cubic-bezier | 200ms ease |
| M4 | activation.css:28 | dot transition | `.18s ease` | `--sig-ease` | cubic-bezier | duration matches, easing does not |
| M5 | clocker-motion.ts:14 | GSAP entrance | `y: 6, opacity .55 → 1, .24s, power2.out` | `--sig-dur-rise` | `360ms`, 8px | 240ms / 6px on the Clocker (review gap 13 wants CSS) |
| M6 | auth-premium.css:76 | `.ap-primary:active` | `scale(.96)` | `--sig-press-scale` | `.98` (clocker-shell:104) | .96 on sign-in, .98 on the Clocker, none in the employee app |

### Additional conflicts found while writing this spec

| # | File:line | What | Today | Canonical / rule | Note |
|---|---|---|---|---|---|
| S1 | auth-premium.css:131-133 | sign-in panel grain | 180px tile, `baseFrequency .9`, 2 octaves, opacity `.55` | `--sig-grain` (160px, `.85`, 3 octaves) at `--sig-grain-opacity .07` | a different texture on the desktop sign-in panel; not byte-identical, so it was not mapped |
| S2 | clocker-pin.module.css:1-11, :57 | PIN setup palette and font | `--pin-primary #077572` (Gusto teal), a second `@font-face` for Inter from `/fonts/typeface/inter/variable.ttf` | `--sig-deep`, `--sig-font-clocker` | `.primary` is unused (the form uses `nv-btn`, review gap 18); the second Inter copy is part of Decision D3 |
| S3 | clocker-setup.module.css:19, :44-46, :56 | Clocker setup status colours | `#24533c`, `#97302f`, `#a43836`, `#287647` on `#eaf6ef` | `--sig-done-*`, `--sig-urgent-*` | hard-coded reds and greens outside the ladder (review gap 4) |
| S4 | tokens.css `--sig-dur-press` | press duration | `120ms` (from sign-in) | the press rule in section 7.2 says 80–100ms; the review says 90ms | the token records today's value; the rule is the target. Decision D8 |
| S5 | tokens.css `--sig-action` role "links" | link colour | Signature links render in ink with a rule-coloured underline (`.sg-link`, `.ap-link`) | `--sig-action` describes links as teal | role and rendering disagree. Decision D5 |
| S6 | tokens.css `--sig-info-*` | "info" status | no element is labelled info; the token holds the untoned neutral pill (`#55585A` on `#EFEDE8`) | TEAM-RULES ladder: grey neutral or waiting | the name says info, the use is neutral. Rename or split before anything reads it |
| S7 | src/lib/notifications/manifest.ts:15-19, src/app/app/layout.tsx:48 | PWA and browser theme colour | `theme_color #1C4A47`, `background_color #FFFFFF` | band `--sig-deep #0D3634`, page `--sig-page #F7F6F3` | the status bar and launch colour predate Signature (review gap 7) |
| S8 | employee-style.css, app-shell.tsx (`NavIcon`) | active tab icon | regular weight, deep colour, 600 label | Principle 3: fill only for the active tab | the principle is a target for the employee tab bar |

---

## 17. Decisions for Jose

Nothing below is applied. Each "yes" in the last column means the choice changes what users see and needs its own
before/after screenshots.

| # | Decision | Options | Review recommends | Changes pixels? |
|---|---|---|---|---|
| D1 | Colour for "done / approved" | A: keep teal (`#0A5753` on `#E2F1ED`) on employee, activation and Clocker. B: green like sign-in (`#1D6F42` on `#E7F4EC`; `#EAF5EA` renders) and Manager. Also C18: "done" text currently uses the action teal `#0B6E69`. | B | B: yes |
| D2 | Display weight floor | Keep 200 on `.sg-date`, `.sgDurHero`, `.sg-ticket b`, `.ap-band__greet`, `.act-id__value` and the Clocker clock; or set a 300 floor. | 300 | 300: yes |
| D3 | Typeface | A: system font everywhere (the Clocker and PIN move off Inter). B: Inter everywhere. Either way, PIN setup bundles Inter a second time under another name and path (`clocker-pin.module.css:1-7`), which should become one copy. | B | yes, on one side |
| D4 | Company branding (B1) in Signature | A: accent on buttons and links only, never the band. B: logo only. | — | A: for branded companies |
| D5 | Link colour | Keep ink links with a quiet underline (built), or make links teal `--sig-action` (the token's stated role). | — | teal: yes |
| D6 | Control (button) radius | 16px today (`--sig-radius-control`; 10px on Home, Schedule, Requests and desktop sign-in; 18px on the Clocker), or 14px as the review proposes. | 14 | yes |
| D7 | Band headline weight | 300 on `SigBand` pages vs 400 on Home, Schedule and Requests (T1); one band padding (22/24/62 vs 18/24/58). | 300, one padding | yes |
| D8 | Press feedback | Scale .98 (Clocker) vs .96 (sign-in) vs none (employee); duration 120ms (sign-in) vs 160ms (Clocker) vs 90ms (review). | .98, 90ms | yes |
| D9 | `/reset-access` | It still shows the pre-Signature ivory colours (C2) because it does not load `auth-signature.css`. Move it onto Signature, or keep it as is. | move | yes |
| D10 | 11px caps and the 10px Clocker "Workforce" line | Raise every caps label to 12px; decide whether the lockup line counts as a label. | 12px | yes |
| D11 | Untracked boards | Add the phase-3, phase-4, activation v3 and Clocker c4 boards (section 15.2) to the repository. | add | no |
