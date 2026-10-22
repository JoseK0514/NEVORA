# 22 UI Designer: tokens and theming (colour, type and spacing tokens; dark mode and high-contrast readiness)

## Verdict
The v3 Owner and Manager look is held together by literal values, not tokens. The clean-manager CSS defines 14 `--cm-*` colour tokens but hard-codes 269 colours (241 hex, 28 rgba). Its desktop palette (`#111`, `#6B6B68`, `#ECECEA`, `#0B6B67`, `#B42318`) has no tokens at all. Because `--cm-tint` is a literal, the company brand colour that Owners set in Settings never reaches Owners or Managers.

The app is not ready for dark mode or high-contrast mode:
- There is no `prefers-color-scheme` rule anywhere in `src/`.
- The clean shell has no `prefers-contrast` or `forced-colors` rules.
- The older high-contrast fallbacks lose the cascade to the clean selector.

The fix is mostly mechanical: one semantic token layer, then dark and high-contrast blocks that only change token values.

**Measured:**
- Across all of `src/**/*.css`: 1,369 hex uses (265 unique), 127 near-neutral hexes and 396 custom properties in about 30 namespaces.
- In the clean-manager CSS (`premium-clean-manager.css` plus `clean-manager/*.css`, 401 KB): `var(--nv-*)` is used 0 times.

## Recommendations

1. **Make the company brand reach Owners and Managers, or stop promising that it does.**
   - **What:** Set `--cm-tint: var(--g-accent, #087571)` and `--cm-tint-press: var(--g-accent-hover, #06605D)`. Add `--cm-tint-strong: var(--g-accent-strong, #0B6B67)` and replace the 21 literal `#0B6B67` values with it. In `derive.ts`, add `#F2F2F7` as a contrast floor: the accent must reach 4.5:1 on the grouped grey, which means at least 5.03:1 on white. A brand accent at exactly 5.0:1 on white drops to 4.48:1 on `#F2F2F7`.
   - **Why:** The tint is a literal, and the shell also sets `--nv-accent: var(--cm-tint)`, so `--g-accent` is overridden (`premium-clean-manager.css:9,14`). The brand inline style sits on that same element (`app-shell.tsx:210-211`). The brand editor tells Owners: "Buttons, links, selected items and the header use this color" and "Everyone sees it the next time a page loads" (`brand-editor.tsx:113,78`). For the Owner who changed the colour, both statements are false. TEAM-RULES:57 lists company branding within B1 as a constant.
   - **Impact:** High. **Effort:** S. **Owner:** UI. Product (Jose) decides whether v3 keeps NEVORA teal. If it does, change the editor copy to say "your team's app and Clocker tablets".

2. **Give the v3 desktop palette tokens and merge it with the phone palette.**
   - **What:** Use one set of role names with values per width, for example `--cm-ink`, `--cm-ink-2`, `--cm-line`, `--cm-surface`, `--cm-surface-2`, `--cm-hover`, `--cm-track`, `--cm-tint`, `--cm-tint-strong` and `--cm-tint-wash`. Phones keep their iOS values and desktop keeps its warm greys, but every rule reads a role name. See the Appendix.
   - **Why:** The desktop colours are literal in the mockup itself (`mockups/v3.css:110-194`), and the build copied them. The most frequent literals in the clean CSS:

     | Value | Uses |
     |---|---|
     | `#FFF` | 77 |
     | `#6B6B68` | 76 |
     | `#111` | 57 |
     | `#ECECEA` | 41 |
     | `#0B6B67` | 21 |
     | `#000` | 21 |
     | `#FAFAF9` | 15 |
     | `#F1F1EF` | 14 |
     | `#E2E2DF` | 13 |

     There are also 62 literal white backgrounds and 182 literal `color:` hexes. The same role also has two teals: the phone tint is `#087571` (5.54:1) and the desktop primary button is `#0B6B67` (6.34:1) (`premium-clean-manager.css:404,420`). This step has to come first: until it is done, a dark theme would only reach about 5% of colour declarations.
   - **Impact:** High. **Effort:** M. **Owner:** UI.

3. **Use one status ladder with ink, fill and mark values for each tone.**
   - **What:** Define `--tone-{urgent,review,done,neutral}-{ink,fill,mark}` once and use it on both phone and desktop.
   - **Why:** Four ladders are in use today:
     - Phone, `--cm-*`: `#D70015`, `#A05A00`, `#1E7B34`.
     - Desktop, hard-coded: `#B42318`, `#93500A`, `#1D6F33`, plus `#D92D20` for badges and the now line.
     - iOS tile fills: `#FF3B30`, `#FF9500`, `#34C759`.
     - Kit and Employee, `--nv-*` and `--g-urgent`: `#A3361F`, `#8A5300`, `#1F6B45`, `#E1553F`.

     The iOS tiles put a white glyph on `#FF9500` at 2.20:1 and on `#34C759` at 2.22:1 (`premium-clean-manager.css:25-27`). The ladder's own `#C93400`, `#1E7B34` and `#D70015` already carry white at 5.28 to 5.38:1. Separately, `#007AFF` iOS blue colours the "Team tools" More icon (`:250`). It is the only non-teal blue in the app and breaks "teal for actions only".
   - **Impact:** High. **Effort:** M. **Owner:** UI. Product confirms red or coral for urgent, because TEAM-RULES:53 says coral.

4. **Collapse the near-duplicate greys and point the kit and Gusto tokens at v3 values on the clean shell.**
   - **What:** Inside the clean shell, set `--nv-ink`, `--nv-muted`, `--nv-hairline`, `--nv-border`, `--g-ink`, `--g-muted` and `--g-hairline` to the `--cm-*` roles. App-wide, move to one neutral ramp of about 10 steps.
   - **Why:** There are 127 near-neutral hexes:
     - **Secondary text:** 8 variants between 5.2 and 7.1:1 (`#5F6368` ×32, `#5F666A`, `#6C6C70`, `#6B6B68`, `#676A73`, `#5E5E62`, `#575B65`, `#555862`).
     - **Ink:** 7 variants (`#000`, `#111`, `#16191C`, `#18191F`, `#1C1C1C`, `#222`, `#20232D`).
     - **Hairlines and fills:** about 25 between 1.17 and 1.30:1.

     These come from three neutral families: warm stone (desktop v3), iOS cool (phone v3) and Google or Tailwind cool (`--g-*`, older pages). The clean CSS never reads `--nv-*` (0 uses). Any kit component that v3 did not override one by one therefore still shows `#16191C` and `#5F666A` beside v3's `#000` and `#6C6C70`.
   - **Impact:** Medium. **Effort:** M. **Owner:** UI.

5. **Add high-contrast and reduced-transparency support to v3, and fix two status graphics that fail 3:1.**
   - **What:** On the clean shell, add `@media (prefers-contrast: more)` that changes only token values:

     | Token | Value | Contrast |
     |---|---|---|
     | `--cm-sep` | `#808086`, drawn at 1px | 3.52:1 on `#F2F2F7` |
     | `--cm-label-2` | `#3C3C43` | 10.9:1 |
     | `--cm-tint` | `#005A57` | 8.08:1 |
     | `--cm-label-3` | `--cm-label-2` | |
     | Bars | Solid | |

     Also:
     - Add `prefers-reduced-transparency: reduce` that makes the bars solid.
     - Add `forced-colors: active` rules for the active tab, selected row, segmented control and timeline bars, using `Highlight` or `CanvasText` with `forced-color-adjust` where needed.
     - In the base theme, give timeline status graphics a 3:1 edge: "No clock-in" `#E5958A` is 2.33:1 (use `#C0473B`, 4.99:1), and "Later today" `#E4E4E1` is 1.27:1 (add an inset edge in `#949490`, 3.04:1). Both are at `premium-clean-manager.css:56-57,62-63`.
   - **Why:** No `prefers-contrast` or `forced-colors` rule exists in `premium-clean-manager.css` or `clean-manager/*.css`. The existing fallbacks for the translucent tab bar have specificity (0,4–5,2) (`portal-premium.css:150`, `portal-motion.css:131`). The clean rule at `premium-clean-manager.css:219` has (0,10,2). So an Owner on a phone with "Increase contrast" or "Reduce transparency" still gets the `.94`-alpha bar with a 20px blur and 0.5px separators at 29% alpha. Ratios for `#808086` and `#005A57` are computed in the Appendix. The cascade loss is reasoned from specificity, not checked in a browser.
   - **Impact:** High. **Effort:** S–M. **Owner:** UI.

6. **Prepare for dark mode in four stages, and do Stage 0 now.**
   - **Stage 0 (S, now):** Declare `:root { color-scheme: light }` and add `<meta name="color-scheme" content="light">`. Today only `mobile-workforce.css:37` sets it, and only on the Employee phone shell. Without it, Android Chrome auto-dark and Samsung Internet's forced dark can invert pages unpredictably, and form controls can render with dark system styling on a light page.
   - **Stage 1 (M):** Recommendations 2–4 (tokens).
   - **Stage 2 (M):** Inside `@media (prefers-color-scheme: dark)`, scoped to `[data-nv-clean]`, redefine only the role tokens; use the dark column in the Appendix. Add a `[data-theme="light"|"dark"]` override for a user setting later. Change illustration `#FFFFFF` fills (`components/illustrations/index.tsx:14-42`) to `currentColor` or a token.
   - **Stage 3 (S):** Return `themeColor` as a media array, light and dark (see recommendation 7).
   - **Employee and Lead pages:** Leave them until they move onto v3.
   - **Why:** There are 0 `prefers-color-scheme` rules in the codebase. NEVORA's managers close restaurants and shops at night, so a dark theme is a real comfort feature, and iOS users expect it.
   - **Impact:** Medium. **Effort:** L overall. **Owner:** UI. Product decides whether dark mode goes on the roadmap.

7. **Match `theme-color` to the v3 shell.**
   - **What:** `generateViewport` returns the masthead colour `#1C4A47` for every role (`app/app/layout.tsx:42-44`). For the clean shell (Owner or Manager session), return `#F2F2F7` on phones and later `{media: "(prefers-color-scheme: dark)", color: "#000"}`.
   - **Why:** v3 has no teal header. In Safari's tinted chrome and on Android, Owners and Managers see a dark teal strip above a light grey large title. This is inferred from the code, not checked on a device.
   - **Impact:** Medium. **Effort:** S. **Owner:** UI.

8. **Bundle type into role tokens and drop the unused Inter preload for v3.**
   - **What:** Define `--cm-t-*` roles that each bundle size, line height and tracking:
     - **Phone:** large-title 34/41, title-2 22, headline 17/22 semibold, body 17/22, callout 16, subhead 15/20, footnote 13/18, caption 12.
     - **Desktop:** ui 13.5/18, ui-small 12.
   - **Why:**
     - The same size is written four ways. 13.5px appears 40 times as `0.8438rem`, `.84375rem`, `0.84375rem` or `.8438rem`. 12.5px, 11.5px, 10.5px and 9px are written the same way (`timecards.css:208` uses `.5625rem` for avatars).
     - Tracking literals such as `-.43px` (×36) belong inside the roles.
     - Chart ticks are set in px (`insights.css:222,229`), so they ignore the reader's text size.
     - Phone sizes leak onto desktop: on Home at 1440, "Show 2 more" renders at 17px next to "Open Inbox" at 13.5px (`QAOWNER-home-1440.png`).
     - `layout.tsx:48` preloads Inter (`variable.woff2`, 242 KB) on every `/app` page, but Owners and Managers render the system font. Preload it only when the shell is not clean.
   - **Impact:** Medium. **Effort:** S–M. **Owner:** UI.

9. **Move tokens and theme blocks out of the specificity arms race.**
   - **What:** Put v3 tokens and component rules in `@layer clean` and use one `:where([data-nv-clean])` scope.
   - **Why:**
     - The clean CSS repeats a 106-character prefix 1,499 times, about 159 KB of 401 KB.
     - About 130 `:not(#cm-*)` id hacks add id-level specificity, for example `:not(#cm-stack)` ×25 and `:not(#cm-s)` ×22.
     - Every dark, high-contrast or brand override must match (0,10,2) plus ids, which is why the high-contrast fallbacks in recommendation 5 lose. With layers, the dark block is about 40 lines on one selector.
   - **Impact:** Medium. **Effort:** M–L. **Owner:** UI, with a visual-regression pass.

10. **Add a guardrail so literals don't come back.**
    - **What:** Write one vitest that parses `premium-clean-manager.css` and `clean-manager/*.css` and fails on any new hex or rgba outside the token block, with a frozen allow-list that shrinks over time. It can follow the `readFileSync` pattern in `lib/notifications/manifest.test.ts`. Add a matching stylelint rule (`color-no-hex` scoped to those files) if stylelint is added.
    - **Why:** The 269 literals got in during fast QA rounds; without a check, the token work in recommendations 2–4 will erode.
    - **Impact:** Low–Medium. **Effort:** S. **Owner:** UI.

## What's good
- The B1 brand derivation (`lib/workspace-presentation/derive.ts`) solves for contrast floors (white on the accent at 5:1 or better, masthead at 7:1, masthead ink at 4.5:1). It is a ready-made generator for dark and high-contrast accent variants.
- The token values that exist already pass: `--cm-label-2 #6C6C70` is 5.23:1 on white and 4.69:1 on `#F2F2F7`, and every phone status ink is at least 4.76:1 on the grouped grey. Kit tokens (`kit.css:10-75`) document their ratios inline, which is the right habit.
- The accent alias chain (`portal-gusto.css:34-69` maps about 30 legacy names to `--g-*`) means older pages already have one source of truth for teal. Dark mode for those pages is a token swap once literals are removed.

## Not checked / limits
- I did not use a browser (not allowed by my brief). The cascade loss under `prefers-contrast` or `prefers-reduced-transparency`, the theme-color strip, and auto-dark inversion are reasoned from source and specificity, not rendered.
- All contrast ratios were computed with the WCAG relative-luminance formula on solid hex values. Alpha colours were judged by their solid equivalents.
- I did not audit Employee and Lead CSS (`globals.css`, 13.8k lines) in depth beyond counts. I did not check SVG icon colours or chart palettes beyond Insights ticks.
- Spacing: the clean CSS sits mostly on a 4px grid with iOS metrics (11, 22, 7). I judged it low priority and made no spacing recommendation beyond the role tokens.

## Appendix: proposed v3 role tokens (light / dark / high contrast)

Ratios are on the paired surface. "P" means phone and "D" means desktop.

| Role | Light P | Light D | Dark P | Dark D | High contrast (light) |
|---|---|---|---|---|---|
| `--cm-surface` (page) | `#F2F2F7` | `#FFFFFF` | `#000000` | `#161615` | same |
| `--cm-cell` / panel | `#FFFFFF` | `#FFFFFF` | `#1C1C1E` | `#1F1F1E` | same |
| `--cm-surface-2` (sidebar, table head) | `#F2F2F7` | `#FAFAF9` | `#2C2C2E` | `#1B1B1A` | same |
| `--cm-ink` | `#000` | `#111` (18.9) | `#EDEDED` (14.5 on `#1C1C1E`) | `#E8E8E6` (14.8) | `#000` |
| `--cm-ink-2` | `#6C6C70` (4.69 on `#F2F2F7`) | `#6B6B68` (5.12 on `#FAFAF9`) | `#98989F` (5.94 / 4.86 on `#2C2C2E`) | `#9E9E9A` (6.14 on `#1F1F1E`) | `#3C3C43` (10.9) |
| `--cm-line` | `rgba(60,60,67,.29)` 0.5px | `#ECECEA` | `rgba(84,84,88,.6)` | `#2E2E2C` | `#808086` 1px (3.52) |
| `--cm-field-edge` | `#8A8A87` (3.46) | same | `#6E6E6A` (3.22 on `#1F1F1E`) | same | `#3C3C43` |
| `--cm-tint` (text, links) | `#087571` (5.54; 4.96 on `#F2F2F7`) or brand | `#087571` or brand | `#4FC3BA` (7.98 on `#1C1C1E`) | `#4FC3BA` (7.74) | `#005A57` (8.08) |
| `--cm-tint-fill` (primary button) | `#087571`, white 5.54 | `#0B6B67`, white 6.34 | `#4FC3BA` with `#000` label (9.85) | same | `#005A57` |
| `--tone-urgent-ink` | `#D70015` (4.83 on `#F2F2F7`) | `#B42318` (6.57) | `#FF6961` (6.03) | `#F28B82` (6.91) | `#9A3412`-class darker |
| `--tone-review-ink` | `#A05A00` (4.76) | `#93500A` (6.19) | `#FFB340` (9.54) | `#E3A04F` (7.39) | darker by one step |
| `--tone-done-ink` | `#1E7B34` (4.78) | `#1D6F33` (6.22) | `#30D158` (8.42) | `#6FCF97` (8.68) | darker by one step |
| `--tone-*-tile` (white glyph) | `#D70015` / `#C93400` / `#1E7B34` (5.3–5.4) | n/a | same fills | n/a | same |

**Brand rule:** a company accent replaces `--cm-tint` and `--cm-tint-fill` in light mode only after passing 4.5:1 on `#F2F2F7`. In dark mode, derive the light variant with the same `solve()` in `derive.ts`, targeting 4.5:1 or more on `#1C1C1E`.
