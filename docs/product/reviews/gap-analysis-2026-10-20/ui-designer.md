# UI gap analysis: what NEVORA is missing

October 20, 2026 · UI Designer · Read-only review. No app code was changed and nothing was committed.

**Sources.** Code is from branch `claude/auth-premium` at `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS/8c7acfe8-4195-49cb-a26a-ba2ac9ec5c59/scratchpad/auth` (paths below are relative to that root unless they start with `docs/`). I also read `DESIGN.MD`, `.21st/DESIGN.md` and `docs/product/TEAM-RULES.md`, the Signature boards and build screenshots in `docs/product/specs/employee-style/signature/`, and the October 18 reviews in `docs/product/reviews/`. I computed contrast ratios with the WCAG 2.x formula, blending translucent colours over their real background first. I started no server and took no new screenshots, so every screen claim points to evidence that was already saved.

---

## Executive summary

On a phone, the Signature direction is the most premium NEVORA has looked: a deep band, a soft sheet, light figures and quiet caps. The concept is not the gap. The gaps are underneath it and around its edges.

1. **The approved look exists only as pictures and copied CSS.** `DESIGN.MD` never mentions Signature. It still lists the Gusto teal `#077572`, a login blue `#0756D9` and JetBrains Mono labels. `TEAM-RULES.md` still says Inter. Every new Signature page re-declares its own copy of the palette: `#0D3634` is defined in 10 files under six prefixes.
2. **Four surfaces speak four dialects.** The employee app, sign-in, the Clocker and Manager/Owner each have their own typeface choice, neutral greys, status colours, button height and corner radius. A Lead who clocks in at the tablet, checks Home and then reviews the team crosses all four in one minute.
3. **Phones get no feedback when you tap.** The Signature layer has no `:active` (pressed) style anywhere, and `globals.css:77` turns off the tap highlight. On an iPhone, a tapped row or button looks the same until the next page arrives. Of everything here, this does the most to make the app feel unfinished, and it is cheap to fix.
4. **The frame around Signature is still the old app.** The desktop and tablet shell (white sidebar, teal-wash active item, breadcrumb bar), the PWA status-bar colour, the offline page and the toast all predate Signature. The seams show at exactly the places people look first: launch, the top of the screen and confirmations.
5. **System states are built one by one.** Offline, "session ended", "access changed", pending and error each have five or more local versions with different words and looks. There is no shared banner, no error toast and no undo.

Do this before dark mode or more screens: write one Signature token file and one component sheet, move the four surfaces onto it, and remove the per-page copies. Without that, dark mode means editing about ten palettes by hand, and each new screen will drift again.

---

## Prioritised gaps

P0 blocks a premium release or dark mode. P1 is visible to most users. P2 is polish.

| # | Gap | Where (file / screen) | Why it matters for Jose's bar | Priority | Fix direction |
|---|---|---|---|---|---|
| 1 | **No written Signature system, and the canonical docs contradict it.** | `DESIGN.MD` front matter (teal `#077572`, `login-blue #0756D9`, `label-md` JetBrains Mono, `rounded.control 17px`). `TEAM-RULES.md` says "Inter for type". `docs/product/specs/employee-style/signature/` holds only PNG boards and `mock.css`, with no spec `.md`. `src/components/signature/signature.tsx:5` points to `phase-1/p1c-*.png`, which is not in `docs/`. | "Clean" means every screen follows one rule set. When the rules are missing, each agent re-derives them from screenshots, which is why the copies below exist. | P0 | Add a dated "Signature system" section to `DESIGN.MD` and update the front matter: colour roles, type roles, spacing, radii, elevation, motion, icon rules and the caps-label exception. Update the TEAM-RULES constants (typeface, action colour). Put the missing phase-1 and phase-2 boards back into `docs/`. |
| 2 | **The palette is copied per page.** | `--sg-*` (`signature.module.css:5-8`), `--e5-*` (`employee-style.css:8-10`), `--h5-*` (`employee-home-today.module.css`), `--s6-*` (`employee-my-schedule.module.css:6-8`), `--r6-*` (`request-hub.module.css`), `--ck-*` (`clocker-shell.module.css:5-25`), plus unprefixed `--cream/--paper` (`auth-premium.css:6`, overridden in `auth-signature.css:5`). Across 85 CSS files and 30,555 lines there are 344 unique hex colours, 1,717 `:not(#…)` specificity lifts and 250 `!important`. | One wrong hex in one copy is how warm-white turns slightly different between two tabs. Dark mode and company branding have nothing central to switch. | P0 | Create one `signature-tokens.css` that declares `--sig-*` on `:root` (or a single `[data-sig-theme]`). Page modules should read those tokens and never declare their own. Retire the `--h5/--s6/--r6/--e5` copies and stop adding `:not(#x)` lifts; use `@layer` ordering instead. |
| 3 | **Three typefaces, and an ultra-light display weight on whatever font the device has.** | The employee app uses the system stack (`employee-style.css:73-78`, `signature.module.css:9-10`). Sign-in also uses the system stack (`auth-premium.css:10`). Manager uses the system stack (`premium-clean-manager.css:8`). The Clocker bundles Inter (`clocker-shell.module.css:1`, "Nevora Clocker" = `inter-variable.ttf`), as does PIN setup (`clocker-pin.module.css:1-7`). DESIGN.MD labels use JetBrains Mono. Display weight 200 appears at `.sg-date`, `.sgDurHero`, `.sg-ticket b` and `.ap-band__greet`. | Weight 200 maps to different cuts on SF, Roboto and Segoe UI, so the same hero looks thinner on iPhone and blurrier on Android and Windows. The Clocker (Inter) and the app (SF) now look visibly different. TEAM-RULES lists ultra-light weights under "Avoid". | P0 | Pick one: (a) Inter variable everywhere, already shipped in `/public/fonts`, or (b) the system font everywhere, with TEAM-RULES updated. Either way, set the display floor at weight 300 and keep light figures at 40px and above. My recommendation is (a): it is the brand constant, renders the same on Android, and is already in use on the Clocker. |
| 4 | **The status ladder has drifted into dialects, and the employee app uses teal for "done".** | Employee: approved/done pill `#0A5753` on `#E2F1ED` (teal), red `#A3271A` (`signature.module.css:121-122`); the activation success check is teal too. Manager: `--cm-green #1E7B34`, `--cm-red #D70015`, `--cm-amber #A05A00`, plus iOS tiles `#FF3B30/#FF9500/#34C759` (`premium-clean-manager.css:12, 26-29`). Auth: danger `#B42318`, done `#1D6F42` (`auth-premium.css:8-9`). Clocker setup: `#97302f`, `#a43836`, `#287647`, `#24533c` (`clocker-setup.module.css`). DESIGN.MD lists coral `#E1553F`. | The ladder (grey, amber, green, coral) is a constant, and teal is reserved for actions. A green "Approved" for a manager and a teal "Approved" for an employee look like two different states. White glyphs on the iOS orange and green tiles measure 2.2:1. | P0 | Define four status roles, each with an ink, wash and line value, measured on white and on `#F7F6F3`. Make employee "done" green, not teal. Replace the manager's iOS tile colours with the ladder washes and dark glyphs. Remove the hard-coded reds and greens in Clocker setup. |
| 5 | **Taps produce no visible response.** | No `:active` rule in `signature.module.css`, `employee-style.css` or any of the 12 `*-signature.module.css` files. `globals.css:77` sets `-webkit-tap-highlight-color: transparent`. Elsewhere the press feedback differs: `.ap-primary:active` scale .96, `.nv-btn` .98, PIN .98. | Native apps confirm every touch within about 100ms. Without that, the app feels like a web page, and people tap twice, which matters on Withdraw or Send. | P1 | Add one shared press token: rows get the background `--sig-press` (about 4% ink), buttons get scale .98 plus a darker fill, both within 80–100ms, and with no transform when reduced motion is on. Apply it to `.sg-r`, `.sg-row`, `.sgLinkRow`, `.sg-cta`, `.sg-primary`, `.sg-round`, `.sg-band-link`, tab-bar links and the More sheet rows. |
| 6 | **The primary button has six heights and six radii, and goes grey while it works.** | Heights: `.sg-primary` 44, PIN 48, manager `.nv-btn` 50, `.nv-btn` kit and Clocker tablet 52, `.sg-cta` 54, activation `.act-submit` 56. Radii: 10 (`.ap-primary` desktop), 12 (manager), 16 (`.sg-cta`, `.ap-primary` phone), 17 (PIN), 26 (Clocker card), 999 (`.sg-primary`, `.sg-band-link`). While saving, `.sg-cta:disabled` turns `#C9CFCD` with the text "Saving…" (`availability-signature.tsx:103`). | The main button is the most repeated object in the product. Different sizes make screens feel assembled from different kits. A button that turns grey while saving reads as "disabled" or "failed". | P1 | Define a button scale: primary 52px with 14px radius on phones and 44px on desktop, secondary as an outline at the same size, and a text link. Use pill shapes only for chips and the band link. Pending keeps the deep fill, shows a 16px Phosphor `CircleNotch` spinner (static under reduced motion) and sets `aria-busy`. |
| 7 | **The shell around Signature is still Gusto, and the seams show.** | Desktop at 1440: white sidebar, teal-wash active item and breadcrumb bar, with the Signature column centred at 760px while section tabs and breadcrumb stay left-aligned (`phase-3/build/_app_requests_tab_my-chromium-1440-100.png`). Tablet at 768: phone deep header plus desktop sidebar; the page title "Shift requests" is dark ink on the deep header and the section tabs are nearly invisible (`phase-3/build/_app_exchange_tab_requests-chromium-768-100.png`). PWA `theme_color` is `#1C4A47` and `background_color` `#FFFFFF` (`src/lib/notifications/manifest.ts`, `src/app/app/layout.tsx:48`), against a band of `#0D3634` and a page of `#F7F6F3`. The offline page shows a legacy blue flame mark beside the wordmark (`phase-4/build/offline.png`, `public/fuel-portal-offline.html`). | Launch, the status bar and the first desktop view are what people judge "premium" on. A mismatched status-bar colour, a white launch flash and an old logo on the offline page all look like mistakes. | P1 | Give the employee shell a Signature desktop frame: a soft-white sidebar, the active item in deep-teal ink with no wash, and one left edge shared by tabs, band and content. Fix the 768–1023 range so it uses either the phone header or the desktop sidebar, not both. Set the employee manifest and theme colour to `#0D3634` and the background to `#F7F6F3`. Redraw the offline page with the Λ mark and Signature tokens. Re-verify all of this on the current build, because the screenshots come from phase-3 and phase-4 runs. |
| 8 | **System states are local, not shared.** | Offline: the Signature board `p4b-board-c.png` exists, but no app-level banner is built ("No connection right now" appears only in the service-worker page). Offline, paused, "session ended" and "access changed" copy is reimplemented in `employee-home-reviewed.tsx:276`, `timecards.tsx:169/241`, `communication-detail.tsx:63`, `manager-inbox.tsx:25`, `manager-attendance-review.tsx:185` and `premium-home.tsx:106`. `OfflineNotice` (`wave-a/offline-notice.tsx`) is used only inside wave-a. The toast (`toaster.tsx`, styles in `portal-motion.css:166-183`) uses Gusto `#077572` and `#5F6368`, has a 32px close button and offers only success and info tones, with no error tone and no undo. | Pay and time data has to be trusted. When the same situation is worded and drawn differently on each page, the app looks less reliable than it is. Without undo, a mistaken Withdraw or Decline is final. | P1 | Build four shared Signature pieces: (1) a connection banner under the header (offline, reconnecting, back online), (2) a session-ended sheet that offers sign-in again and keeps the draft, (3) a no-access screen in the `SignatureError` frame, and (4) a Signature toast with success, info and error tones, an Undo slot for reversible actions and a 44px close target. Pages then call these pieces and do not write their own copy. |
| 9 | **Band typography changes from tab to tab.** | Home and Schedule draw their own bands: `.h5Band h1` and `.s6Band h1` are 400 weight at 40px, with padding 18/24/58 (`employee-home-today.module.css:23-29`, `employee-my-schedule.module.css:20-26`). `SigBand` pages use 300 at 46px (`.sg-word`), 200 at 60px (`.sg-date`), 200 at 54px (`.sgDurHero`) and 300 at 40px (`.sg-head2`), with padding 22/24/62 (`signature.module.css:20-35, 152`). | Switching between bottom tabs makes the band's height and the heading's weight jump. Smooth tab changes are a large part of what makes an app feel calm. | P1 | Move Home and Schedule onto `SigBand`. Fix three hero roles (word 300/44, figure 300/56, headline 300/40) and one padding. |
| 10 | **Accessibility risks in the new look.** | The default focus ring is ink (`.sgRoot :is(a, button, summary, input):focus-visible`, `signature.module.css:16`, and the same rule in `h5/s6/r6`); on the deep band that is 1.31:1. Only `.sg-band-link` switches to white. The empty ticket figure uses `#B9B6AF` on white, 2.02:1, and it is text (`.sg-ticket b[data-empty]`). The manager disclosure caret `--cm-label-3` is 1.74:1 and carries open/closed state. Manager avatar initials are white on `#A6ABB9`, 2.30:1. Tracked caps sit at 11–12px (`.sg-pair dt`, `.sg-day small`, `.sg-ticket small`, `.ap-label` on phones, Clocker `.summary dt`), below the 15px phone floor, and no exception is written down. | Jose's "user friendly" includes older staff and bright-sun kiosk use. A focus ring that disappears on the band also fails WCAG 2.4.7 and 2.4.11. | P1 | Any element on the band takes a white or mint focus ring; make that the band's default rather than a per-link override. Show empty figures as an em dash in `--sig-ink-3`. Set the caret to at least 3:1 and avatar initials to at least 4.5:1, using deep-teal text on a mint wash. Document one caps exception: 12px minimum, weight 600, at least 4.5:1, never the only carrier of meaning. Raise the 11px caps to 12px. |
| 11 | **Company branding (B1) is silently switched off.** | `derive.ts` still produces `masthead` and `accent`, but `employee-style.css`, `signature.module.css` and `auth-signature.css` ignore them, and the manager hard-codes `--cm-tint #087571` over `--nv-accent`. The Clocker comment says "the deep-teal side stays NEVORA's". | Company branding is a sold feature and a TEAM-RULES constant. Today a branded company sees its colour only in older screens. | P1 (decision) | Jose decides: does Signature allow a company accent (buttons and links only, never the band), or is branding limited to the logo? Then wire it through the token file from gap 2. |
| 12 | **Empty states are a centred grey sentence.** | `.sg-empty` (`signature.module.css:50`): grey 15px text in a card, with no icon and no action. | Empty is the first state a new company sees. A bare sentence looks unfinished. Jose has ruled out illustration on Home, so the fix must use something else. | P2 | Use one empty pattern: a 42px `.sg-tile` with a Phosphor icon, a 17px title, one line in `ink-2` and at most one action. No illustration. |
| 13 | **No motion system in the Signature layer.** | No animation or transition in `signature.module.css` or `employee-style.css`. Sign-in rises over 360ms (`auth-premium.css:26`). The Clocker loads GSAP for a 240ms, 6px fade (`clocker-motion.ts`). The old app has its own motion (`portal-motion.css`). Six CSS files animate without a reduced-motion block, including `premium-clean-manager.css`, `availability-signature.module.css`, `employee-updates-signature.module.css`, `shift-requests-signature.module.css` and `auth-support.css`. | Short, consistent motion is what makes an app feel native. Pulling in a library for one fade is the kind of technical debt the team rules warn against. | P2 | Define three motion tokens (press 90ms, state 180ms, sheet 280ms, all `cubic-bezier(.2,.7,.2,1)`). Add a sheet-rise on route change, and use cross-fades for the band figure and toast. Every rule gets a `prefers-reduced-motion: reduce` version (opacity only). Replace GSAP in the Clocker with CSS. |
| 14 | **Icons mix styles.** | Clocker action tiles use `weight="duotone"` (`clocker-punch-panel.tsx:149, 161`, `clocker-setup.tsx:81, 91`), while the employee app uses regular or thin. Signature also draws its own chevron and download glyphs instead of Phosphor (`signature.tsx:55-65`). Fourteen icon sizes appear across Signature, Clocker and activation (10 to 52px). | Jose rejected hand-drawn-looking icons. Mixed weights and custom strokes are what make an icon set look "cheap". | P2 | Use Phosphor regular everywhere, with fill only for the active tab. Replace `SigChevron` and `DownloadIcon` with `CaretRight` and `DownloadSimple`. Limit sizes to 16, 20, 24 and 32, plus 44 on the Clocker. |
| 15 | **Two greys: warm for employees, cool iOS for managers.** | Employee `#F7F6F3`, `#6F6C66`, `#E8E5DF`. Manager `#F2F2F7`, `#6C6C70`, `rgba(60,60,67,.29)`, `#ECECEA`, `#6B6B68` (40 uses) (`premium-clean-manager.css:10-11`). | Leads and managers see both in one day. The warm-to-cool jump makes NEVORA look like two products. | P2 (Manager track) | When the manager clean-up lands, give it the Signature neutrals; it can keep its denser layout. |
| 16 | **Large text, long names and copy case.** | At 200% text the band hero fills the first screen and the section tabs are clipped with no scroll cue (`phase-3/build/_app_requests_tab_my-chromium-390-200.png`). Puerto Rican double surnames in 46px light display rely on `overflow-wrap: anywhere` (`.h5Band h1`), which breaks words in the middle. The Clocker uses Title Case ("Clock Out", "Start Break", "Refresh Clock State") while the app uses sentence case. | Large text and long names are normal for this market. Mid-word breaks and mixed capitalisation look careless. | P2 | Cap hero size with `min(…, 12vw)`, use the first name only in greetings, set `text-wrap: balance` and `hyphens: manual`, and add an edge fade to scrolling tab rows. Use sentence case everywhere, Clocker included. |
| 17 | **Data visualisation has no style.** | The kit has `Progress` and `StatGrid` (`components/kit/kit.tsx`). There is no chart component and no chart colour ramp, and Signature figures are text only. | Pay, hours and coverage are numbers people compare. The first chart someone adds without a spec will clash with the system. | P2 | Before any chart ships, specify: one bar or week-strip style for hours, ladder colours only for status, deep-teal ink for the series, and the tracked-caps axis labels. |
| 18 | **Dead and legacy styles still in the bundle.** | `clocker-pin.module.css` `.primary` (teal fill with `#111827` text) is unused because the form uses `nv-btn`. `--nuvora-*` (176 uses), `--fuel-*` and `--coffee-*` prefixes remain. | They cost bundle size and confuse agents that grep for patterns. | P2 | Remove them during the token consolidation in gap 2. |

---

## Notes

### 1. Consistency across the four surfaces

| Property | Employee Signature | Sign-in / activation | Clocker | Manager / Owner (clean) |
|---|---|---|---|---|
| Typeface | System (SF / Roboto / Segoe) | System | Inter (bundled) | System |
| Page | `#F7F6F3` | `#F7F6F3` (over `#F4EFE7` base) | `#F7F6F3` | `#F2F2F7` / white |
| Muted text | `#6F6C66` (4.84:1 on page) | `#6F6C66` / `#6E6A63` | `#6F6C66` | `#6C6C70` / `#6B6B68` |
| Primary action fill | Deep `#0D3634` | Deep `#0D3634` | Deep `#0D3634` | Teal `#087571` |
| Primary height / radius | 54 / 16 (CTA), 44 / pill | 52 / 10 (desktop), 16 (phone); 56 / 16 activation | Cards 104 / 26 | 50 / 12 |
| Card radius | 18 (`.sg-list`), 22 (`.sg-card`) | 22 (field group) | 22–26 | 10 |
| Card edge | inset 6% ink + layered shadow | inset 6% ink + shadow | 1px `#E3DFD8` + shadow | hairline |
| Done / approved | Teal pill | Teal check | Teal dot | Green `#1E7B34` |
| Urgent | `#A3271A` | `#B42318` | — | `#D70015` / `#FF3B30` |
| Icons | Phosphor regular + custom SVG | Phosphor | Phosphor duotone | Phosphor regular / fill |
| Press state | none | scale .96 | — | scale .98 (kit) |

Card edges are nearly invisible by design: a 6% ink inset on `#F7F6F3` measures 1.05:1. That suits the calm look, but it means the shadow alone separates cards from the page. If that shadow is ever removed (dark mode, Windows high contrast, print), cards disappear. Keep a real 1px `--sig-rule` edge as the fallback.

### 2. Missing states and components

| State | Status today | Needed |
|---|---|---|
| Skeleton loading | Signature skeletons exist for Home and the band routes (`employee-style.css:62-72`), with no shimmer | Fine. Add a 1.2s opacity pulse that is off under reduced motion. |
| Empty | `.sg-empty` grey sentence | Icon tile, title, line and action (gap 12) |
| Toast / confirmation | Gusto-styled, success and info only | Signature toast with error tone and Undo (gap 8) |
| Undo | None found in employee flows | Withdraw, decline and cancel-swap get a 5s Undo toast |
| Offline banner | Per page; SW page only | Shared banner (gap 8) |
| Session expiry | Per page ("Your session ended") | Shared sheet that keeps drafts |
| Permission denied | "Access changed" in one component | `SignatureError` variant |
| Pending button | Grey disabled fill | Deep fill plus spinner (gap 6) |
| Long names / numbers | Partly handled (`overflow-wrap`) | Greeting rules (gap 16); test `120h 45m` in `.sgDurHero` at 320px |
| 320px | Container query at 359px (`signature.module.css:153-160`) | Good. Keep it. |
| 200% text | Hero fills the first screen | Capped hero size (gap 16) |
| Landscape tablet | Clocker covered (1024/1180 shots); employee 768–1023 is a hybrid | Fix the hybrid (gap 7) |
| Focus | Present but ink on the band | Band focus default (gap 10) |
| Reduced motion | 67 files handle it; 6 animated files do not | Gap 13 |

### 3. Design-system gaps

There are two component sets. The older kit (`src/components/kit/kit.tsx`, `nv-*`) has Button, Card, Rows, Avatar, Status, Tile, Toast, FilterPills, Progress, StatGrid and Duration. Signature forked it into global `sg-*` classes (`.sg-cta`, `.sg-pill`, `.sg-tile`, `.sg-card`, `.sg-r`) and a second `Duration` (`signature.tsx:29`). Neither set has a Field, Select, Sheet, Tabs/Segmented, Chip, Avatar-with-photo or Chart.

Before dark mode or new screens, put these in place:

1. **One token file** (`--sig-*`): colour roles (page, card, ink 1–3, rule, deep, mark, mint, sky, action, the four status roles with ink/wash/line), type roles (hero word, hero figure, headline, row, body, callout 15, caps 12, tab 13), spacing (4/8/12/16/20/24/32/40), radii (control 14, card 22, sheet 28, pill), elevation (card, raised, sheet) and motion (press, state, sheet). Each token gets a dark value column, even if left empty for now.
2. **React components** in place of global class strings: `SigButton` (primary, secondary, link, with pending), `SigField` and `SigFieldGroup` (the sign-in card style, for every form), `SigList` / `SigRow`, `SigCard`, `SigPill` (status), `SigTabs` (band and page variants), `SigSheet` (bottom sheet with drag handle and safe area), `SigToast`, `SigBanner`, `SigEmpty`, `SigAvatar`, `SigSkeleton`.
3. **A living reference page.** `/ui-preview` exists; add `/ui-preview/signature` showing every component in every state, so review is one screenshot rather than a crawl.
4. **A lint guard**: block raw hex values in `*-signature.module.css` and in new `:not(#…)` selectors.

### 4. Premium polish, ranked by how visible it is

1. Press feedback on every tappable element (gap 5): seen on every tap.
2. Status-bar and launch colour match (gap 7): seen on every open.
3. A steady band between tabs (gap 9): seen on every tab switch.
4. Button pending and success: the CTA keeps its colour, shows a spinner, then a short check before the toast. Seen on every submit.
5. A sheet-rise route transition at 280ms (gap 13).
6. A Signature toast with Undo (gap 8).
7. Figure details: tabular numbers are already used. Add a cross-fade when a band figure changes (for example the running Duration), and tighten optical spacing on the `h` and `m` units, which `word-spacing: .1em` currently pushes apart.
8. Empty states with an icon tile (gap 12).
9. Icon clean-up (gap 14).
10. Chart style for Pay and My time (gap 17).

Haptics: with no native wrapper, only `navigator.vibrate` exists, and it is Android-only. Leave haptics until the wrapper decision. Do not imitate them with motion.

### 5. Accessibility, beyond gap 10

- **Contrast that passes:** `ink-2 #5F625E` on page 5.72:1, `ink-3 #6F6C66` on page 4.84:1, band eyebrow (white at 62%) 6.05:1, pair `dt` (white at 60%) 5.77:1, mint on deep 9.14:1, all three Signature pills 6.1–7.2:1, disabled CTA text 4.78:1, manager label-2 4.69:1.
- **Contrast that fails:** see gap 10. Also `#B8892F` note dots (2.92:1) and the Clocker break dot `#C98A2E` (2.71:1) carry state next to text. They pass only because the word is also present; keep it that way.
- **Targets:** Signature rows are 72–76px, the CTA is 54px, round buttons 44px. The toast close button is 32px (`portal-motion.css:180`). `.ap-aside-link` stretches its hit area with `::after inset calc(50% - 22px)`, which works but should be a shared utility.
- **Focus order:** the phone sign-in hides the eyebrow and title visually but keeps them in the h1 (`auth-signature.css:37`), which is good. The band link comes before the sheet content in DOM order, which is correct. The More sheet gives focus an inset outline. I did not run a keyboard pass for this review; the last real keyboard evidence is in the phase-3 and phase-4 build folders.

### 6. What I did not verify

No live browser run, no real iPhone, no Android, no screen reader. The 768 and 1440 seam findings come from phase-3 and phase-4 build screenshots and may already be partly fixed on the current branch. Manager/Owner is on its own track; I list only what bears on cross-role consistency. Known items (no dark mode, no Spanish activation, no real-iPhone check) are not repeated.

### Draft scorecard for the fix set (gaps 1–10)

| Line | Score | Note |
|---|---|---|
| Usability | 2 | Press feedback, pending and shared states make tasks clearer |
| Familiarity | 2 | Native press and sheet patterns |
| Trust | 2 | One ladder, one look, no old logo |
| Accessibility | 2 | Fixes focus on the band, failing contrast and the caps floor |
| Brand distinctiveness | 2 | Keeps Signature; removes Gusto leftovers |
| Durability | 2 | A token file and components outlast single pages |
| Cost | 1 | Consolidation is real work, though it lowers cost afterwards |
| Continuity | 2 | No moves or renames |
| **Total** | **15 / 16** | |
