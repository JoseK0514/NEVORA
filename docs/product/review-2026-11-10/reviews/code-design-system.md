# NEVORA Direction B: design-system consistency audit (code)

Date: 2026-11-10. Read-only review; no repository files were changed.

## Scope and method

**Reference read first:** DESIGN.MD "Current direction (November 8, 2026)" and every Direction B section (lines 1363–1666), plus docs/product/direction-b/README.md.

**Approved values used as the baseline:**
- Inter; teal `#0B6E69`; band `#0C726C` to `#08504C`; canvas `#F2F5F4`.
- Ink `#111517`; grey `#6A7176`.
- 22px white cards with a soft layered shadow; pills for actions and chips; 14px field corners.
- Phosphor bold icons; 48px+ targets; press scale 0.96 over 150ms.
- Status colours: red stops, amber waits or checks, green is done, teal is information.

**Files parsed.** 20 stylesheets, 12,179 declarations, parsed with a comment-aware CSS parser that keeps line numbers:
- owner-b: `owner-b.css`, `owner-b-shell.css`, `owner-b-pages.css`, `owner-b-desktop.css`
- employee-b: `employee-b-desktop.css`, `employee-b.css`, `account.css`, `pay.css`, `requests.css`, `schedule.css`, `time.css`
- `auth-b.css`, `clocker.module.css`, `corp.css`, `quiet.css`
- `leave-staffing.css`, `coverage-minutes.css`, `device-settings.css`, `unsupported-role.css`, `portal-device-setup.css`

**Components grepped:** the matching TSX files, plus `app-shell.tsx`, `nav-icon.tsx`, `notification-bell.tsx`, `action-menu.tsx`, `command-finder.tsx` and the auth components.

**Line numbers.** Several files keep whole rules on one very long line (for example owner-b-desktop.css is 179 KB in 829 lines), so a `file:line` reference points at the rule's line, not a column.

**Verification.**
- **Run:** declaration inventories (colour, type, radius, shadow, state, motion, specificity). WCAG 2.x contrast was computed from the declared colours, with alpha composited over the declared background.
- **Not verified (no browser in this audit):** rendered backgrounds behind translucent text (the hero gradient varies by position), cascade winners where several layers compete, forced-colours mode, real hover behaviour on tablets, and the effect of a stored dark-theme preference.

Severity: **High** blocks reading or misleads, or is a systemic failure. **Medium** is a visible inconsistency. **Low** is isolated polish.

---

## 1. Colour

### Inventory

**Literal use.**
- 1,535 colour literals in the 20 files. 190 of them sit inside token definitions; 1,345 are raw `#hex`/`rgb()` values in declarations.
- Only 75 declarations use a `var(--b-*)` token.

**Five token namespaces for one design:**

| Namespace | Defined at | Tokens |
|---|---|---|
| `--b-*` | owner-b.css:18 | 15 |
| `--nvd-*` | owner-b-desktop.css:14 | 5 |
| `--c-*` | corp.css:8 | 22 |
| `--q-*` | quiet.css:9 | ~30 |
| `--ck-*` | clocker.module.css:14ff | — |

**Distinct values by family** (OKLCH; neutrals are chroma < 0.025):

| Family | Distinct (opaque) | Main value | Near-duplicates |
|---|---|---|---|
| Teal | **29** (24) | `#0B6E69` ×152 | Band and hero starts `#0C726C`, `#0E7A74`, `#0F7C75`. Band ends `#08504C`, `#08524E`, `#084F4B`, `#0B4F4B`, `#06403C`. Pressed `#0A5F5A`, `#095C58`, `#08605B`. Ink-hero teals `#17302D`, `#152A28`, `#11221F`, `#0C1918`, `#0A1817`. Shadow tints `#102826`, `#051E1C`, `#061E1C`, `#05302E`. |
| Neutral grey | **74** (+9 tinted washes) | `#6A7176` text, `#ECEEEF` line | Text: `#6A7176`, `#6B7075` (corp), `#6B6B6B` (quiet), `#5E666B`, `#7D868B`, `#7E868B`, `#8C9397`, `#8A9399`, `#9AA3A8`, `#A3A9AE`, `#A7ACB1`, `#B5BBBF`. Ink: `#111517`, `#1A1C1E` (corp), `#111413` (quiet), `#1C1C1E`. Lines: `#ECEEEF`, `#EDEEEF`, `#EDF0F0`, `#EBEEEE`, `#E4E8E8`, `#E6E9EA`, `#E3E5E6`, `#E3E6E7`, `#E1E5E6`, `#E3E7E8`, `#E6EBEA`. |
| Red | **7** (+1 wash) | `#B42318` ×37 | `#C8322B` (owner-b-desktop.css:52), `#C42B1C` (quiet), `#8F1C13` (pressed/notice), coral `#FF6B5E`, `#F4B7B0`, `#E19A92` |
| Amber | **8** (+2 washes) | `#8A4B00` ×14 | `#D98A1B` (leave-staffing edge), `#E2A13B`, `#FFC46B`, `#FFD596`, `#F3D3A0`, `#6E3C00`, `#FFE2B0` |
| Green | **4** (+3 washes) | `#1D6B45` | `#1F7A45` (leave-staffing.css), `#1D8A55` (clocker), `#B3DDC3`; washes `#E7F4EC`, `#E7F5EC` |

Within the B layers alone (excluding corp and quiet):
- **6 grey text colours:** `#6A7176` ×59, `#3F464B` ×38, `#B5BBBF` ×8, `#8C9397` ×4, `#A3A9AE` ×2, `#A7ACB1` ×1.
- **16 grey or tinted fills.** The hover and press tints alone are `#F7F9F9`, `#F2F5F4`, `#F0F3F3`, `#F4F6F6`, `#F4F7F6`, `#EEF1F1` and `#F7F8F8`.

### Contrast (computed)

| Pair | Ratio | AA |
|---|---|---|
| Grey `#6A7176` on white | 4.96:1 | Pass |
| Grey `#6A7176` on canvas `#F2F5F4` | 4.52:1 | Pass (0.02 margin) |
| Grey `#6A7176` on quiet fill `#F0F2F3` | 4.41:1 | **Fail** |
| Grey `#6A7176` on teal-50 `#E8F3F1` | 4.37:1 | **Fail** |
| Grey `#6A7176` on line `#ECEEEF` | 4.26:1 | **Fail** |
| `#7D868B` (tab labels) on white | 3.71:1 | **Fail** |
| `#8C9397` on sidebar `#FBFCFC` | 3.03:1 | **Fail** |
| `#A3A9AE` / `#A7ACB1` / `#B5BBBF` on white | 2.37 / 2.29 / 1.94 | Fail (disabled or decorative only) |
| White on `#0B6E69` / `#0C726C` / `#0E7A74` | 6.09 / 5.77 / 5.18 | Pass |
| White /0.75 on `#0B6E69` / `#0C726C` / `#0E7A74` | 4.19 / 4.00 / 3.65 | **Fail** |
| White /0.76 on `#0C726C` (desktop band sub-lines) | 4.05:1 | **Fail** |
| White on the hero's radial highlight (`#24948B` composite) | 3.69:1 | **Fail** |
| White /0.72 on glass (`rgb(255 255 255/.12)` over `#0B6E69` = `#287F7B`) | 3.28:1 | **Fail** |
| White /0.70 placeholder on glass over `#0C726C` | 3.07:1 | **Fail** |
| Glass chip white on `rgb(255 255 255/.16)` over teal | 4.37:1 (3.86 on `#0E7A74`) | **Fail** |
| Hero chips `#FFD596` "due" / `#9BF0D6` "ok" on their tints over teal | 3.60 / 3.60 | **Fail** |
| Amber chip `#8A4B00` on `#FDF3E4` | 6.19:1 | Pass |
| Red chip `#B42318` on `#FDECEA` | 5.75:1 | Pass |
| Green chip `#1D6B45` on `#E7F4EC` | 5.72:1 | Pass |
| Teal chip `#0B6E69` on `#E8F3F1` | 5.37:1 | Pass |
| Grey chip `#3F464B` on `#F0F2F3` | 8.54:1 | Pass |
| Field edge `#D5DADC` on white (non-text, needs 3:1) | 1.41:1 | **Fail** |
| Amber edge `#D98A1B` on white (non-text) | 2.76:1 | **Fail** |
| Coral unread dot `#FF6B5E` on teal (non-text) | 2.18:1 | **Fail**; the 2px ring keeps it visible, but the dot is the only unread cue |

To pass 4.5:1, white secondary text on the band needs at least these alphas:
- 0.80 on `#0B6E69`
- 0.83 on `#0C726C`
- 0.90 on `#0E7A74`
- 0.96 on glass

### Findings

| # | Sev | Location | Evidence | User impact | Fix |
|---|---|---|---|---|---|
| C1 | **High** | **Phone kit:** owner-b.css:51 (`.b-eyebrow` .78), :52 (`.b-sub` 14px .75), :57 (`.b-hkicker` .72), :65 (`.b-live__l` 12.5px .72), :67 + :256 (`.b-live__v small`, .6 then .74), :74 (`.b-seg` 14px .8), :76 + :78 (search text and placeholder .72), :230 (`.b-week__d` 12px .7). **Desktop band:** owner-b-desktop.css:41 (.7), :44 (.45), :64, :177, :190, :309, :367, :412, :489, :619 (.76), :96 (.7 placeholder). **Elsewhere:** schedule.css:8; auth-b.css:96–99; clocker.module.css:84–85 | White text on the band uses **17 distinct alphas (0.45–0.92)**. All of them under the alphas listed above fail. Small text on glass fails even at 0.9 | Sub-lines, live-figure labels, week-day letters, segmented labels and search placeholders are the key context on every main screen, and they read at 3–4:1 | Add two band text tokens: `--b-on-band: #FFFFFF` for titles, figures and labels on glass, and `--b-on-band-2: rgb(255 255 255 / .86)` for sub-lines on solid band only. Remove the other 15 alphas. Show hierarchy on glass through size and weight, not alpha |
| C2 | **High** | owner-b.css:166–168 and 247 (hero chips); owner-b.css:184–185 (`.b-ink__due` on ink passes, 7.9:1) | `.b-chip--glass` white on .16 glass: 4.37:1. `--due` `#FFD596`: 3.60:1. `--ok` `#9BF0D6`: 3.60:1. All at 12px/600 | Status chips on the hero ("Live", "Due") fail where the status matters most | On the teal hero, use a solid white chip with status ink: `#8A4B00` on white, or `#1D6B45` on white. Keep the ink-hero chip variant, which passes |
| C3 | **High** | owner-b-shell.css:51 | Tab bar labels: 10.5px, weight 500, `#7D868B` on a white /0.9 bar = 3.71:1 | Every phone page's primary navigation reads below AA, at the smallest size in the app | Use `#6A7176` (4.96:1 on white) for inactive labels and keep the teal active state |
| C4 | **High** | owner-b-desktop.css:34 (sidebar group labels, 12px/600 `#8C9397` on `#FBFCFC`, 3.03:1); :723 (select placeholder `#8C9397`); employee-b-desktop.css:356 (availability axis labels 12px `#8C9397`) | Readable text set in a decorative grey | Desktop navigation group names and the availability scale are hard to read | Point all three at the grey text token `#6A7176` (4.85:1 on `#FBFCFC`) |
| C5 | Medium | owner-b.css:18 (`--b-grey`) used on `#F0F2F3` / `#E8F3F1` / `#ECEEEF` fills, for example the quiet button fills and the tinted notes in account.css and requests.css | 4.41 / 4.37 / 4.26:1 | Secondary lines inside tinted notes and grey fills fall just under AA | Add `--b-grey-on-fill: #5E666B` (5.21:1 on `#F0F2F3`, 5.16:1 on `#E8F3F1`; the value is already used in clocker.module.css:179) and use it wherever grey text sits on a tint |
| C6 | Medium | account.css:63; owner-b-desktop.css:168; owner-b-pages.css:242 (`#D5D8DA`); requests.css:126,177; account.css:181; corp.css:120,175 (`--c-field`) | Field edges are `#D5DADC`/`#D5D8DA`: 1.41:1 against the white card, in three notations (`border`, `inset 0 0 0 1px`, `inset 0 0 0 1.5px`) | Empty fields inside white cards are hard to find, especially for low-vision users (WCAG 1.4.11) | One field-edge token at 3:1 (for example `#8C9397` = 3.12:1), drawn one way: `border: 1px solid`, with the focus state switching colour only |
| C7 | Medium | Token sets: owner-b.css:18–19 (`--b-*` scoped to `.b-screen`, so the page, shell and desktop layers cannot use them); owner-b-desktop.css:14 (`--nvd-*` on `:root`); corp.css:8–11; quiet.css:9 | 1,345 literal colours. **owner-b-desktop.css alone has 280 literal uses.** Corp's `--c-ink #1A1C1E`, `--c-grey #6B7075`, `--c-line #EDEEEF` and `--c-bg #F5F6F6` differ slightly from B's `#111517`, `#6A7176`, `#ECEEEF` and `#F2F5F4` | Any corp or quiet element B doesn't repaint shows a slightly different ink, grey, line or canvas (a subtle "two apps" feel). Every future colour change needs hundreds of edits | Move the `--b-*` set to `:root`, under `[data-nv-b]`. Then repoint `--c-*` and `--q-*` at it in one block, so the older layers inherit B's values without new overrides. Replace literals file by file, starting with owner-b-desktop.css |
| C8 | Medium | Band gradients: owner-b.css:38 (`#0E7A74 → #0B6E69 → #06403C`, 160deg, plus a radial highlight); owner-b-pages.css:21 (`… → #08524E`, 180deg); owner-b-desktop.css:14 (flat `#0C726C`, then `#08504C`); auth-b.css:13 (`… → #08504C`); auth-b.css:22,44,187 (flat `#0C726C`); clocker.module.css:59 (165deg); owner-b-desktop.css:36 (150deg). Ink band: owner-b.css:42, :180; owner-b-pages.css:432 (`→ #11221F`); owner-b-desktop.css:239 | 7 teal band recipes and 3 ink recipes. DESIGN.MD names one band: `#0C726C` to `#08504C` | Moving from a phone page to a secondary page or to sign-in visibly shifts the band's hue and brightness. The lighter `#0E7A74` start and the highlight are also what push C1 under AA | Define `--b-band` (and `--b-band-ink`) once, using DESIGN's stops, and reuse it in all layers. If the radial highlight is kept, cap it so text areas stay at or below `#0C726C` |
| C9 | Medium | Shadow tint literals: `rgb(16 40 38 / …)` ×104; `rgb(16 24 32 / …)` ×19; `rgb(0 0 0 / …)` ×37; `rgb(11 110 105 / …)` (teal glow) ×~20; `rgb(6 30 28)` / `rgb(5 30 28)` / `rgb(8 96 91)` | Four shadow base colours for one elevation system | Cards, sheets and popovers cast slightly different shadow hues: green-black, blue-black and pure black side by side | Use one `--b-shadow-rgb: 16 40 38` and build every shadow from it (see S2) |
| C10 | Low | quiet.css (30+ warm and iOS greys: `#6B6B6B`, `#8A8A87`, `#F2F2F0`, `#1C1C1E` and others) | Quiet's palette is still the base under the B pages layer | Any quiet element that the pages layer misses (empty rows, skeletons, route states, quiet.css:604) shows a warm grey next to B's cool grey | Covered by C7: repoint `--q-*` at `--b-*` |

### Status-colour use (rule: red = stop, amber = wait or check, green = done, teal = information)

| # | Sev | Location | Evidence | Impact | Fix |
|---|---|---|---|---|---|
| C11 | **High** | owner-b-desktop.css:52 | Owner and Manager desktop: the top-bar bell's **notification count is a red numeric badge** in `#C8322B`, a seventh red. The same notifications are a coral dot on phones (owner-b-shell.css:40, employee-b.css:42) and on Employee desktop (employee-b-desktop.css:15), and a **teal** sidebar count on Employee desktop (employee-b-desktop.css:13; DESIGN: "teal (not urgent)") | Unread updates are information, but here they look like a blocking alert. The same data has three colour meanings across roles and widths | Use the Employee desktop treatment: coral dot on the bell, teal count where a number is shown. Remove `#C8322B` |
| C12 | Medium | owner-b.css:209 (`.b-step--done .b-step__n` teal fill); employee-b-desktop "done" states also use teal | A finished step is teal, but "done" is green elsewhere (`.c-tc-cue[data-done]` `#1D6B45` at owner-b-desktop.css:750; green chips) | The same completion state reads as "information" on the setup stepper and as "done" on timecards | Fill finished steps green (`#1D6B45`, with `#E7F4EC` for the wash) and keep teal for the current step |
| C13 | Medium | owner-b-desktop.css:323 | The account menu's "Sign out" is red `#B42318` | Red means stop or destructive. Sign out is neither, so it competes with real destructive actions such as Delete account (account.css:183–191) | Use ink or teal text for Sign out, and keep red for Delete or Turn off |
| C14 | Low | leave-staffing.css:36 (`#D98A1B` 4px amber edge, 2.76:1); leave-staffing.css (`#1F7A45` green) | A different amber and green from the chip tokens | The repair note's amber edge is fainter than every other amber and below non-text contrast | Use `#8A4B00` at 4px (or the amber-50 fill plus an amber ring) and `#1D6B45` |

---

## 2. Typography

### Inventory (all 20 files)

**font-size: 50 distinct values.**
- Pixel values: 15px ×151, 13px ×94, 17px ×78, 14px ×62, 13.5px ×56, 14.5px ×47, 15.5px ×31, 16px ×17, 12.5px ×16, 12px ×16, 20px ×11, 30/28/32px ×9 each, 24px ×7, 34px ×5, 11px ×4, 18/22/40/19px ×3, 11.5px ×2, and 26, 48, 10.5 and 9px ×1 each.
- Clocker uses rem only: 21 rem/clamp values such as .9375rem, .8125rem, .84375rem, .90625rem, .78125rem and .96875rem.
- **Between 12 and 17px there are 10 sizes:** 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 17.

**font-weight: 4 values** (400 ×30, 500 ×54, 600 ×227, 700 ×114). This is fine.

**line-height: 40 distinct values.**
- In px: 20 ×127, 18 ×109, 22 ×67, 21 ×44, 19 ×30, 34, 38, 36, 30, 25, 16, 26, 24, 40, 46, 28, 41, 23, 13, 17, 15, 32, 19.6, 22.5, 12.
- Unitless: 1, 1.45, 1.4, 1.3, 1.6, 1.5, 1.2, 1.35, 1.1, 1.12, .95, 1.25, 1.05.

**letter-spacing: 34 distinct values.**
- B layers use em: -0.01, -0.02, -0.025, -0.03, -0.035 and 0.04em.
- Quiet uses px: -.1, -.2, -.4, -.5 and -.6px.
- Corp uses px: -0.04, -0.13, -0.3, -0.36, -0.45, -0.56, 2.4 and 3.2px.
- The same value is also written in two spellings (`-0.01em` ×18 and `-.01em` ×10).

**Text below 12px.**

| Size | Location | Element |
|---|---|---|
| 9px | corp.css:213 | Wordmark `.c-lockup__word` (a logotype, acceptable) |
| 10.5px | owner-b-shell.css:51 | Tab labels |
| 11px | owner-b-shell.css:58 | Tab badge |
| 11px | owner-b.css:306 | Week-header chip |
| 11px | employee-b-desktop.css:435 | Sidebar count |
| 11px | corp.css:215 | Large lockup |
| 11.5px | owner-b-desktop.css:33 | Sidebar `.nav-count` |
| 11.5px | owner-b.css:202 | `.b-days-l` |

### Heading sizes by role (same role, different surfaces)

| Role | Values found |
|---|---|
| Main page title (band) | Phone kit 30/36 (owner-b.css:49). Phone pages 28/34 (owner-b-pages.css:50,70; intended). Desktop 32/38 (owner-b-desktop.css:63,182,189,196,204,218,618; employee-b-desktop.css:40). Auth phone 30/36 (auth-b.css:28,50). Auth policy 32/38 (auth-b.css:132). Mobile Access 24 and 28 (auth-b.css:202–203). Quiet `.q-hd h1` 34/41 shows through where B misses it (quiet.css:42). Clocker 1.875rem = 30px (clocker.module.css:142) |
| Big title | 34/40 phone (owner-b.css:50) and 40/46 desktop (owner-b-desktop.css:219; employee-b-desktop.css:41). Consistent |
| Card header | 17px everywhere (owner-b.css:100; owner-b-pages.css:190; owner-b-desktop.css:122, 278, 446). Exceptions: 18px (employee-b-desktop.css:118 `.eb-wd__h b`) and 16px (portal-device-setup.css:25) |
| Sheet or dialog title | 17px corp (corp.css:203, 259). 19px (device-settings.css:20; portal-device-setup.css:18). 20px (quiet.css:189; account.css:113). 22px (employee-b-desktop.css:151 shift panel). 18px (account.css:155) |
| Empty-state title | 16px (requests.css:46; schedule.css:45; time.css:50; pay.css:22) vs 17px (quiet.css:177 `.q-emptyblock__title`, which Owner pages use) |
| Uppercase label tracking | 0.04em (owner-b.css:141, 183) and .08em (clocker.module.css:67). The skill target is 0.05em |

### Findings

| # | Sev | Location | Evidence | Impact | Fix |
|---|---|---|---|---|---|
| T1 | Medium | Every B file. Densest in owner-b.css (12.5, 13, 13.5, 14, 14.5, 15, 15.5 on adjacent rules: 65, 105, 127, 52, 88, 20, 125) | 10 sizes in the 12–17px band; 47 uses of 14.5px and 31 of 15.5px; half-pixel steps | Steps 0.5px apart don't read as hierarchy, they read as slight misalignment. Rows on different screens look "almost the same" | Define a role scale and map every rule to it: caption 12.5, meta 13.5, body-sm 14.5, body 15.5, title-sm 17, plus the display sizes. That folds 12/13/14/15/16 into neighbours. As tokens: `--b-fs-caption`, `--b-fs-meta`, and so on |
| T2 | Medium | Dialog and sheet titles (see table): corp.css:203, 259; device-settings.css:20; quiet.css:189; account.css:113, 155; employee-b-desktop.css:151 | Five sizes (17/18/19/20/22) for one role | Opening the shift panel, a confirm dialog or the device popover gives a different title scale each time | One sheet-title size: 20/26 700 at -0.01em |
| T3 | Medium | Empty-state titles: requests.css:46; schedule.css:45; time.css:50; pay.css:22 (16px) vs quiet.css:177 (17px) | Two sizes for the one empty-state pattern DESIGN describes ("one empty state") | Employee and Owner empty states differ | 16/22 600 everywhere; re-point `.q-emptyblock__title` in the pages layer |
| T4 | Medium | owner-b.css:20 (`.b-screen { font-variant-numeric: normal }`), :255 (opt-in list); owner-b-pages.css:153–154 (phone opt-in). The desktop layers have no rule, so they inherit corp.css:14 (`tabular-nums` on the whole `.c-page`); owner-b-desktop.css has 0 numeric rules | Phone opts in to tabular figures only for numbers (to avoid Inter's wide hyphen); desktop and tablet use tabular for everything, including the hyphen the phone rule avoids. owner-b.css:255 lists `.b-tab-badge` under `.b-screen`, but the badge lives in the shell's tab bar (app-shell.tsx:529), so that selector never matches. The tab badge (owner-b-shell.css:58), sidebar counts (owner-b-desktop.css:33; employee-b-desktop.css:13 has it) and the Quiet pages' `td`/`time` on desktop get no deliberate rule | Counts and times change width between phone and desktop, and the "clock - ins" spacing bug comes back on desktop | One rule in the shared kit at every width: `normal` on the page root and `tabular-nums` on `.c-num, .q-num, .b-live__v, .b-row__end b, td, time, .nav-count, .q-count, .b-tab-badge, .portal-notification-count`. Delete the scoped copies |
| T5 | Medium | owner-b-shell.css:51 (10.5px tab label), :58 (11px tab badge), owner-b.css:306 (11px chip), :202 (11.5px), owner-b-desktop.css:33 (11.5px count), employee-b-desktop.css:435 (11px count) | Six declarations under 12px; counts use 11 and 11.5 | The tab label (also C3) and counts are hard to read; the two count sizes differ between roles | Counts 12px/700 everywhere. Tab labels stay 10.5 (approved) but need the C3 colour fix |
| T6 | Low | Line-heights: 40 values, mostly px (owner-b*, employee-b*), unitless in clocker.module.css and account.css:115, 137, 147, 153, 185 | Two unit systems; px line-heights don't follow font-size changes (for example the 13px override at owner-b.css:330 keeps an inherited px value) | Wrapped text in overridden sizes can crowd | Pair each size token with its line-height token (T1) and write them unitless, or keep px only through the token |
| T7 | Low | Letter-spacing: quiet.css (px ×7 values), corp.css (px ×9), B (em); `-0.01em` vs `-.01em` | Two units and two spellings | Tracking differs by surface at the same size | Use em only; fold to 0 / -0.01 / -0.02 / -0.03em and 0.05em for uppercase labels (owner-b.css:141, 183) |
| T8 | Low | owner-b-desktop.css:307 (`.q-select-row__control` 14px at 768px and up, which includes touch tablets); owner-b.css:76 sets 16px on phone search | 14px select text on iPad | iPadOS may zoom on focus in Settings rows | Keep 16px on controls when `pointer: coarse` |

---

## 3. Shape and elevation

### Inventory

**border-radius: 35 distinct values.**
- Counts: 22 ×64, 12 ×48, 16 ×47, 14 ×44, 0 ×44, 18 ×31, 20 ×24, 21 ×18, 10 ×17, 8 ×15, 11 ×14, 4 ×13, 24 ×13, 999 ×12, 6 ×11, 50% ×10, 3 ×9, 5 ×5, 9 ×3, 7 ×3, 17 ×3, 15, 23, 19, 26 ×2.
- Also 13, 28 and 32, plus mixed values such as `22px 22px 0 0` and `4px 4px 2px 2px`.
- Pills are usually written as half the element's height (18, 20, 21, 22, 24, 26) instead of `999px`.

**box-shadow: 129 distinct strings.**
The card elevation alone has at least 7 recipes:
1. `0 0 0 1px rgb(16 40 38/0.05), 0 1px 2px …/0.06, 0 12px 28px -12px …/0.18`: ×18 literal (owner-b.css:98; owner-b-pages.css:113, 119 …), ×4 in another spelling (auth-b.css:65, 129, 165) and ×17 as `var(--nvd-card)` (owner-b-desktop.css:113 …).
2. `… 0 10px 24px -14px …/.22`: leave-staffing.css:33.
3. `0 0 0 1px …/.05, 0 8px 20px -12px …/.18`: owner-b.css:243 (notes).
4. `0 1px 2px …/.06, 0 12px 28px -12px …/.18`, without the ring: owner-b-desktop.css:377; auth-b.css:78.
5. `… 0 24px 48px -24px …/.24`: auth-b.css:102.
6. `… 0 24px 48px -16px …/.32`: portal-device-setup.css:7; leave-staffing.css:60 (with .06 / .08 values).
7. corp `var(--c-shadow-card)`: corp.css:38.

Teal button glows: `0 6px 14px -6px /.6`, `0 4px 10px -6px /.55`, `0 8px 18px -8px /.6`, `0 12px 24px -10px /.7` and `0 10px 22px -10px /.7`.

### Findings

| # | Sev | Location | Evidence | Impact | Fix |
|---|---|---|---|---|---|
| S1 | **High** | **Not pills:** owner-b.css:90 (`.b-btn--full`, 52px, radius 16); :91 (`.b-btn--big`, 56px, radius 18); :192 (`.b-ink__btn`, 48px, radius 14); account.css:204 (`.eb-keep .c-btn` primary, 52px, radius 16); auth-b.css:71 (52px, radius 26, a real pill). **Pills:** owner-b-desktop.css:359, 476 (`.b-ink__btn`, radius 24) | DESIGN: "primary buttons are teal pills". The phone's full-width form primary, the big primary and the payroll ink button are rounded rectangles, while the same buttons on desktop, and the sign-in primary, are pills | The most important button on a phone form changes shape between Sign in, a request form and desktop | Make `.b-btn--full`, `--big` and `.b-ink__btn` `border-radius: 999px` (as auth-b already is) and remove the desktop override |
| S2 | Medium | The card-shadow recipes listed above | At least 7 recipes for "the soft layered shadow", in 3 notations | Cards next to each other (for example a leave-repair note above a Things to do card, or the device popover over a card) have visibly different depth | Define `--b-elev-1` (card), `--b-elev-2` (popover/sheet) and `--b-elev-glow` (teal primary) in the shared token block. Replace the 18 literals, the `--nvd-card` copy and the leave-staffing, portal-device and auth variants |
| S3 | Medium | owner-b.css:243 (`.b-notes > *`: radius 16, lighter shadow); leave-staffing.css:33–36 (22px); coverage-minutes.css | Notes sit in the card stack as card-like surfaces with radius 16 and their own shadow, 12px from 22px cards | Two card shapes in one stack read as an inconsistency, not a hierarchy | Use 22px and `--b-elev-1`, or give notes no surface (an inset tinted block inside the card) |
| S4 | Medium | Pill radii set as half-height: owner-b.css:82 (18), :88 (20), :117 (20); owner-b-desktop.css:79–80, 183–184, 197, 201, 266 (21); :95, :332 (23); employee-b-desktop.css:98, 259 (19); :46 (21); auth-b.css:31, 53 (17) | 9 different values express "pill" | When a label wraps (German, a 320px phone), the button grows taller and turns into a lozenge, because the radius no longer equals half the height | `border-radius: 999px` on every pill and chip |
| S5 | Medium | Segmented controls: owner-b.css:73–74 (14/10/pad 4); owner-b-pages.css:208–211 (12/9/pad 3); account.css:120–121 (13/10/pad 3); owner-b-desktop.css:297–298 (thumb 10, 36px buttons) | Three geometries for one component (each is concentric on its own) | Segments on Things to do, a Quiet page and Profile differ in corner and thumb size | One segmented control: track 14, thumb 10, padding 4, 36px thumb (44px hit) |
| S6 | Low | Field radius: owner-b-pages.css:143 sets 14px on text/search/email/tel/select/textarea, but **not** date, time, number, password or datetime-local, unless they carry `.c-in`. Unclassed date inputs exist at payroll/payroll-settings.tsx:208–209, payroll/pay-date-field.tsx:23 and timecards.tsx:704–705. Desktop (owner-b-desktop.css:154) does include date and time. quiet.css:430, :805 use 12px; corp.css:289–295 `.c-select-btn` uses 8 then 10 | Fields have 14, 12, 10 and 8px corners depending on the input type and layer | On Owner phone Payroll and Timecards, date fields have different corners from the text fields beside them (not verified in a browser) | Write the phone rule by element: `:is(input:not([type=checkbox],[type=radio],[type=range]), select, textarea)`. Move quiet and corp fields to 14px |
| S7 | Low | owner-b-pages.css:67, 93 (`box-shadow: 0 -14px 0 #08524E`), :168 (`border-image: linear-gradient(#08524E…) …`), :169 (`outline: 14px solid #08524E`) | Shadows, outlines and border-images used to paint band extensions | Fragile: a focus ring, a forced-colours user or one changed band colour shows seams | Paint the band once on the page container (as desktop does with `border-image` on the title) |

The 22px cards use a transparent 1px border plus a ring shadow (owner-b.css:97–98). That is correct for forced-colours mode and needs no change.

---

## 4. Buttons and controls

### Variants and heights (visual height, plus hit-area extension)

| Variant | Phone | Desktop and tablet (768px and up) |
|---|---|---|
| `.b-btn` (row and teal) | 36 (+4px `::after` → 44) owner-b.css:82–84 | 40 (owner-b-desktop.css:744) / 42 (employee-b-desktop.css:200) |
| `.b-btn--white` (band main action) | 40 (→48) owner-b.css:88 | 42 Employee (employee-b-desktop.css:46) vs 48 Owner ink (owner-b-desktop.css:476) |
| `.b-btn--full` / `--big` | 52 / 56 | — |
| Band secondary buttons | — | 42 (owner-b-desktop.css:79, 183, 184, 197, 201, 266, 361, 614, 689, 787, 793, 800) |
| Band tabs, segments, week steppers | 36 (owner-b-pages.css:56, 90, 107, 175) | 36 (owner-b-desktop.css:91, 244, 297, 434, 674) and **32** (owner-b-desktop.css:68, 208, 256, 258, 429, 565, 571, 612) |
| Content `.c-btn`/`.q-btn` | — | 40 (owner-b-desktop.css:149) |
| Row trailing button at 320px | 34 (owner-b.css:294) | — |
| Pay "next" row button | 32 (+4 → 40) pay.css:9 | 42 |
| Doc links, language segment | 32 (account.css:163), 34 (account.css:121, 234) | — |
| Shift bar, Fix-my-time send | — | 38 (employee-b-desktop.css:98, 259) |
| Auth primary | 52 pill | 52 pill |
| Clocker | 48–56, rows 84, keys 76–96 | — |

### Findings

| # | Sev | Location | Evidence | Impact | Fix |
|---|---|---|---|---|---|
| B1 | **High** | owner-b-desktop.css:68, 208, 256, 258, 429, 565, 571, 612 (32px); :91, 244, 297, 434, 674 (36px); band buttons at 42px (list above); employee-b-desktop.css:98, 259 (38px) | The desktop layer starts at 768px for touch tablets too (DESIGN: tablets are "small desktop" with 48px rail targets), but week steppers, back links and sub-actions are 32px, tabs 36 and band buttons 42–38, with no hit-area extension | On an iPad the week arrows, band tabs and back link are below the project's own 44px minimum, so they get mis-taps | Add `@media (pointer: coarse)` inside the tablet block: `min-height: 44px` for these selectors, or an `::after { inset: -6px 0 }` hit extension like the phone kit's (owner-b.css:84, 174) |
| B2 | Medium | owner-b.css:333 (`.b-btn, .b-ink__btn, .b-live__a, .b-back` 0.96, 150ms ease-out, guarded); corp.css:115 (`.c-btn` 0.98, 120ms); quiet.css:114 (`.q-btn` 0.97, 160ms); quiet.css:665 (0.98); clocker.module.css:181, 199, 272 (0.96, 120ms `ease`); portal-device-setup.css:22 / unsupported-role.css:6 (0.96, 120ms `ease`) | Three press scales and three durations. The page layers restyle `.c-btn`/`.q-btn` to look like B pills but keep corp's 0.98 and quiet's 0.97, including the auth primary (`.q-btn`) and Approve on request pages | The same teal pill presses differently on Things to do (0.96) and on a time-off request page (0.98) | Add one guarded rule in the shared kit: `:is(.b-btn, .c-btn, .q-btn, .wc-btn):not(:disabled, [aria-disabled=true]):active { scale: .96 }` at 150ms ease-out, and remove the corp and quiet transforms under `[data-nv-b]` |
| B3 | Medium | `:active` scale without a disabled exclusion: clocker.module.css:199 (`.lang`), quiet.css:665–666, unsupported-role.css:6, 8, portal-device-setup.css:22 | Disabled or busy controls still shrink | A disabled control that moves suggests it worked | Add `:not(:disabled, [aria-disabled="true"])` |
| B4 | Medium | Hover outside `@media (hover: hover)`: owner-b-desktop.css:28, 69, 139, 402, 464, 553, 566, 613, 783; employee-b-desktop.css:36, 108, 131, 161, 374; auth-b.css:172; corp.css:56, 114, 122, 249, 344 (20 rules; 12 are correctly guarded) | These layers apply to touch tablets from 768px | On iPad, sidebar entries, rows, the back circle and week arrows keep their hover tint after a tap (they look stuck "selected") | Wrap them in `@media (hover: hover)`. Row hover tints also vary (`#F7F9F9` at :139, `#F2F5F4` at :402, `#F0F3F3` at :28, corp `#F2F4F4`, and `filter: brightness(.97)` at employee-b-desktop.css:131): use one `--b-hover` |
| B5 | Medium | Disabled treatments: owner-b.css:92 (opacity .55); owner-b-pages.css:110 (opacity .6); owner-b-desktop.css:306, 597 (`#E4E8E8` / `#7E868B`); owner-b-desktop.css:185, 267, 789 (white .55 on band); time.css:101, 141 (`#F0F2F3` / `#A3A9AE`); requests.css:119 (`#F0F2F3` / `#A7ACB1`); quiet.css:92, 121 (.5); corp.css:124, 207 (`--c-faint`); clocker.module.css:179–180, 191, 236, 274 (`#E3E7E8` / `#5E666B`, .55, .45) | At least 9 disabled looks; cursor `default` ×14 vs `not-allowed` ×4 | Users can't learn what "not available yet" looks like | One disabled token pair: `--b-disabled-bg: #F0F2F3`, `--b-disabled-ink: #8C9397` (disabled text is exempt from AA, but keep 3:1 so it's still legible), with no shadow and no scale. Cursor `not-allowed` |
| B6 | Medium | owner-b/home-b.tsx:74 | The hero date is a `span.b-btn.b-btn--glass` (aria-hidden): it is styled as a glass button and gets the press scale (owner-b.css:333 targets `.b-btn`) | It looks tappable but does nothing (a dead button on the main screen) | Give it its own non-button style (glass text chip without the pill padding and shadow), or make it the date picker it suggests |
| B7 | Low | owner-b.css:85 vs :268 (`.b-btn--teal` glow `0 6px 14px -6px /.6`, then `0 4px 10px -6px /.55`); owner-b-desktop.css:150, 586, 596 (`0 6px 14px -6px /.6`); auth-b.css:72 / clocker.module.css:176 (`0 8px 18px -8px /.6`); owner-b.css:91 (`0 12px 24px -10px /.7`) | Five glows for the teal primary | Primary buttons have slightly different lift by page | `--b-elev-glow` (S2) |
| B8 | Low | Focus rings: consistent 2px; white on band and teal elsewhere. The `.b-row` inset is correct | Focus is well covered (focus-visible rules exist in every B file) | — | No action. Keep the white-on-band rule when C8 unifies the band |

---

## 5. Icons

**Libraries.** `@phosphor-icons/react` 2.1.10 is the only icon library (187 files). There is no lucide, heroicons or emoji. Text glyphs (›, →, ▾) appear only in comments.

**Weights in TSX:**
- `weight="bold"` ×257, `"regular"` ×12, `"fill"` ×10, `"duotone"` ×9.
- NavIcon defaults to regular (nav-icon.tsx:88).
- About 20 icons without a weight prop default to regular.

### Findings

| # | Sev | Location | Evidence | Impact | Fix |
|---|---|---|---|---|---|
| I1 | Medium | app-shell.tsx:526 (tab bar `weight={active ? "fill" : "regular"}`); app-shell.tsx:424, 451 and nav-icon.tsx:88 (sidebar and rail icons default to regular); notification-bell.tsx:46 (desktop bell `BellSimpleIcon` regular, while phones show the bold `BellIcon`, owner-b-shell.css:66–69); action-menu.tsx:149 (`DotsThreeIcon` regular) and :151 (`CaretDownIcon` with no weight); auth-premium/password-input.tsx:8–9 (eye regular); auth-disclosure-symbol.tsx:6–7 (plus/minus regular) | The Direction B standard is Phosphor bold, but navigation, the desktop bell, menus and the sign-in password toggle use regular (1.5px-equivalent strokes) beside bold content icons | The shell looks lighter and thinner than the page content. The bell changes glyph and weight between phone and desktop | Default NavIcon to `bold` and keep `fill` for active; use `BellIcon` bold on desktop; pass `weight="bold"` in action-menu and the auth controls |
| I2 | Medium | Select carets: corp.css:180 (data-URI Phosphor CaretDown **regular**, `#4A4F54`; used by every `select.c-in` on Owner phone and desktop); time.css:173 (CaretDown **bold**, `#6A7176`); messages-b.tsx:161 (component CaretDown bold, 13px); action-menu.tsx:151 (CaretDown regular, 16px) | Four select carets, in two weights and two colours. Carets baked into SVG data URIs don't use `currentColor` | Dropdowns differ between the Owner's forms, the Employee's Fix my time and Updates | One caret: Phosphor CaretDown bold 16px in `--b-grey`. For native selects use a `mask-image` data URI with `background-color: currentColor`, so it follows the text colour and disabled state |
| I3 | Medium | Caret and chevron sizes: 13 (messages-b.tsx:161), 15 (requests-b.tsx:62), 16 (corp, action-menu), 18 (b-kit.tsx:98 `.b-chev`; owner-b.css:154 `.b-ico svg`). Inline-label icons: 15 (home-b.tsx:74; pay-b.tsx:136), 17 (team-b.tsx:47; timeoff-b.tsx:48; requests-b.tsx:100; messages-b.tsx:155), 19 (messages-b.tsx:157 search), 20 (back). Sidebar 18 for Owner vs 20 for Employee (app-shell.tsx:424) | 5 chevron sizes and 4 sizes for icons inside pill buttons; the sidebar icon size depends on role | Icon optical weight jumps between neighbouring controls; the Owner and Employee sidebars differ | Three sizes: 16 (inline in 14–15px labels and in pills), 18 (trailing chevrons and row icons), 20 (navigation and back). Same sidebar size for every role |
| I4 | Low | `.b-chev` `#B5BBBF` (owner-b.css:133; account.css:156; pay.css:18; schedule.css:35, 53; time.css:135; employee-b-desktop.css:168; owner-b-desktop.css:145; quiet.css:875) = 1.94:1 | Chevrons are below 3:1 | Acceptable while they are decorative (the whole row is the link). Not acceptable where a chevron is the only expand cue (Help, Calendar, Privacy "grey down caret" in account.css:156; schedule.css:35, 53) | Expand carets: `#6A7176`. Row chevrons can stay light |
| I5 | Low | auth-premium/passkey-slot.tsx:12–17 (`FaceIcon` hand-drawn stroke 1.6), and its `lead`/default branches; clocker-pin-icon.tsx (custom stroke icons); auth-shell.tsx:15–61 (`AuthShell`, `Device`, `Mark`) | Custom SVG icons outside Phosphor. **All are unreachable:** login uses `quiet` (login/page.tsx:60), `ClockerPinIcon` has no importer and `<AuthShell` is never rendered | None today; a later change could revive a non-Phosphor icon | Delete the dead branches and files (see L5) |
| I6 | Low | b-kit.tsx:109 (`aria-label` on a `div`), b-kit.tsx:114 (`aria-label` on a chip `span`) | ARIA naming is prohibited on generic elements, so screen readers ignore these labels | If a label adds meaning ("Status: late"), that meaning is lost | Remove it, or add the words as `.b-sr` text |

**Accessible names.** A scan of every `<button>`/`<Link>`/`<a>` in owner-b, employee-b, leave-staffing, native-shell, coverage-minutes, corp, quiet, auth-premium, the shell and the menus found **no icon-only control without a name**. b-kit passes `aria-label` on rows, buttons, live tiles, segments and cards, and `NavIcon` is `aria-hidden` with labelled links. No finding.

---

## 6. Motion

**Inventory.**
- Durations: 90, 100, 120 ×13, 140 ×6, 150 ×20, 160 ×11, 180, 200 ×8, 220, 240, 280, 300 ×5, 320, 360, 420, 800, 900, 1300, 1600 and 8000ms.
- Easings: `ease-out` ×41, `ease` ×26, `linear` ×7, `ease-in-out` ×4, `cubic-bezier(.32,.72,0,1)` ×4, `(.2,.7,.2,1)` ×2, `(.32,0,.67,0)` ×2, `(.23,1,.32,1)` ×1.
- There is no `transition: all` anywhere.

**Reduced motion.** Every keyframe animation with movement is guarded:
- The B kit uses an opt-in `no-preference` block with a cross-fade fallback (owner-b.css:332–343; account.css:219–228; time.css:158–164).
- Corp, quiet and clocker use opt-out `reduce` blocks (corp.css:229, 346, 480, 615, 620; quiet.css:142, 692; clocker.module.css:329–335).
- leave-staffing.css:68 is opt-in.

**Keyframes on toggles.** None found. The Clocker shake is re-triggered by alternating `data-shake=a|b`, which is a valid one-shot. The b-enter stagger matches DESIGN (100ms, 4px blur, 12px, 300ms ease-out).

| # | Sev | Location | Evidence | Impact | Fix |
|---|---|---|---|---|---|
| M1 | Medium | Press and state transitions: owner-b.css:63, 83, 122, 192 (150ms ease-out); corp.css:113, 318 (`--c-dur-press` 120ms); clocker.module.css:175, 198, 269 (120ms/140ms `ease`); portal-device-setup.css:21, 31, 53 and unsupported-role.css:5 (120/140 `ease`); quiet.css:113 (160 ease-out), :664 (160 `(.23,1,.32,1)`), :827 (160 `ease`) | Four press durations and three easings for the same press and hover feedback | Taps feel slightly different by surface | `--b-dur-press: 150ms; --b-ease-out: ease-out` for press, hover and background. Keep `cubic-bezier(.32,.72,0,1)` only for sheets |
| M2 | Low | quiet.css:671 (phone sheet slides 360ms) with reduced motion at quiet.css:692 (`transition: none`) | Under reduced motion the sheet appears instantly. The desktop path cross-fades (corp.css:615–618) | Inconsistent reduced-motion behaviour between phone and desktop sheets | Under `reduce`, use the desktop's opacity cross-fade (160ms) on the phone sheet too |
| M3 | Low | requests.css:106–107 (b-keep entrance, opt-in only) | No `reduce` cross-fade (it appears instantly), unlike owner-b.css:341–343 and account.css:226–228 | A small inconsistency in first-load behaviour | Add the same b-fade fallback |
| M4 | Low | b-enter is declared inside owner-b.css:339 and reused by requests.css:107 and time.css:159 | The keyframes exist only while owner-b.css's media query matches. They match today, but this is a hidden dependency | A future media change breaks the employee entrances silently | Move `@keyframes b-enter` / `b-fade` to top level in owner-b.css |

---

## 7. Layering and debt

### Specificity and `!important` per file

| File | Declarations | `!important` | `:not(#fake-id)` | Repeated attribute or class | Longest selector |
|---|---|---|---|---|---|
| owner-b-desktop.css | 1,712 | **1,690 (98.7%)** | **562** | 536 `[data-nv-b][data-nv-b]`; 536 × `:not([data-nv-b-off])` (attribute never set anywhere in src) | 749 chars |
| employee-b-desktop.css | 965 | **919 (95%)** | **446** (up to 5 per selector) | 299 | 318 |
| owner-b-pages.css | 836 | **797 (95%)** | 2 | 292 × `[data-nv-b]` ×3; 64 doubled classes | **3,050 chars** (line 382) |
| auth-b.css | 435 | 333 (77%) | 15 | 106 × `.q-auth.q-auth` | 233 |
| owner-b-shell.css | 160 | 150 (94%) | 0 | 33 (`.app-shell.app-shell[data-nv-b][data-nv-b]`) | 309 |
| requests.css | 400 | 56 | 0 | 80 (`.c-btn.c-btn.c-btn` at :119) | 208 |
| employee-b.css | 217 | 46 | 2 | 30 | 202 |
| account.css | 606 | 38 | 0 | 34 | 314 |
| quiet.css / corp.css | 2,585 / 1,400 | 28 / 13 | 0 / 2 | 0 / 4 | 300 / 241 |
| owner-b.css | 874 | 19 | 0 | 0 | 190 |
| clocker, leave-staffing, coverage-minutes, pay | — | 4 / 0 / 0 / 0 | 0 | 0 | — |

**Fake-id ladder.** `#nvd-none` ×364, `#nvd-none2` ×166, `#nvd-none3` ×36, `#e-none` ×277, `#e-none2` ×116, `#e-none3` ×35, `#e-none4` ×13, `#e-none5` ×3, `#ab-none` ×15.

With the `:is(#c-root, html) :is(#c-root, body) :is(#c-root, .app-shell)` prefix (3 ids), selectors reach **8 ids** of specificity:
- employee-b-desktop.css:424 has 5 fake ids.
- owner-b-desktop.css:743 has 4.

`:has()` counts: owner-b-pages.css 100, owner-b-desktop.css 94, requests.css 91, employee-b-desktop.css 66, time.css 54.

### Findings and regression risk

| # | Sev | Regression risk | Location | Evidence | Impact | Fix |
|---|---|---|---|---|---|---|
| L1 | **High** | **High** | owner-b-desktop.css (whole file), employee-b-desktop.css, owner-b-pages.css, owner-b-shell.css, auth-b.css | About 3,890 `!important` declarations and about 1,025 fake-id `:not()` steps exist only to beat the layer below. Each round adds `#…-none2/3/4/5` to beat the previous round (employee-b-desktop.css:424 has 5) | Any fix must out-escalate this ladder, so small polish changes break unrelated pages. This is the main source of "a fix on one page broke another" | Put each era in a cascade layer, imported from layout.tsx: `@layer base, signature, clean, corp, quiet, b;`. Later layers win without specificity, so `!important` and fake ids can be removed mechanically per file (start with owner-b-shell.css, the smallest). Note that `!important` inverts layer order, so remove it in the same pass. Specificity resets can use `:where()` |
| L2 | **High** | **High** | src/lib/theme.ts:8 (THEME_SCRIPT still reads `localStorage['nv-theme']`); quiet.css:614–620, 683, 731, 606–608, 622 (`html[data-theme="dark"]` repaints `--q-*` to white ink on black); signature/dark.css (29 rules); the only theme picker (employee-profile-rows.tsx, theme-switch.tsx) has no remaining importer | Direction B is light only, but a device that saved "dark" or "system" in the Signature era still gets `data-theme="dark"` on every load. B repaints with literals, but every Quiet element it doesn't cover reads `var(--q-ink)` and would turn `#F2F2F0` on B's white cards. **The user has no control left to undo it** | Possible invisible text and controls on Quiet-based pages (Settings, Profile, policy pages) for some existing users (**not verified in a browser**) | Make THEME_SCRIPT always set `light` (and clear `nv-theme`). Delete quiet's and signature's dark blocks |
| L3 | Medium | Medium | owner-b-desktop.css vs employee-b-desktop.css | 37 identical declarations repeated for the shared B-screen desktop layout: `.b-screen` width; `.b-hero` position, isolation, padding, background, border and border-image (owner :215 / employee :30–31); `.b-title` and h1 32/38 and 40/46 (:217–219 / :39–41); `.b-eyebrow`; `.b-live` margin, max-width and radius (:222 / :50); `.b-live__v` 28/34; `.b-seg`. **13 conflicting declarations:** `.b-btn--white` 48/24 vs 42/21 (:476 / :46), `.b-live__l` 13 vs 13.5px (:224 / :52), `.b-seg` margin 22 vs 20px (:226 / :56), `.b-btn` 40/18/20 vs 42/16/21 (:744 / :200), `.b-stack` padding 24 vs 32px (:227 / :60) | Owner and Employee desktop drift 1–2px apart on the same component; each fix has to be made twice | Move the shared B-screen desktop layout into one block keyed on `[data-nv-b] .b-screen` (or into owner-b.css's desktop media block). Keep only role-specific differences in employee-b-desktop.css, and decide each of the 13 conflicts once |
| L4 | Medium | Medium | Self-overrides inside one file: owner-b.css:44/272 (`.b-back` left 12 then 14), :67/256 (`.b-live__v small` .6 then .74), :85/268 (teal glow), :173/278 (`.b-filters button`); owner-b-pages.css:25/161, 86/174, 101/229; owner-b-desktop.css:213/338 (max-width 1104 then 1152), 364/429 (36 then 32px); requests.css:44/207, 47/206, 157/218; auth-b.css:50/132 (30 then 32px); corp.css (21 such pairs) | "Round" patches append a new rule rather than editing the old one | Reading the file gives the wrong value; the next fix edits the dead rule | Fold each pair into the original rule |
| L5 | Medium | Low (removal is safe once confirmed) | **Dead in production:** app/app/employee-style.css (50 KB, 153 `[data-nv-e5]` selectors; app-shell.tsx no longer sets `data-nv-e5`, only ui-preview/signature does) imported at app/app/layout.tsx:22; signature/dark.css (29 e5 rules) imported in the root layout:13; `:not([data-nv-b-off])` ×536 (owner-b-desktop.css) for an attribute that is never set; auth-premium.css (23 KB) still imported by 6 auth routes for `.ap-*` classes, mostly from the unused `AuthShell`/`Device` (auth-shell.tsx); passkey-slot.tsx `lead`/default branches; clocker-pin-icon.tsx; employee-shift-picker.tsx (no importer); owner-b.css:255 `.b-tab-badge` inside `.b-screen`; signature/tokens.css comments citing deleted clocker-shell.module.css | Retired looks still ship and still match on preview routes | Extra CSS on every /app load, and stale selectors that can re-match if an attribute comes back | Remove the employee-style.css import from the /app layout (keep it for ui-preview/signature if wanted), drop the dark.css import, delete `:not([data-nv-b-off])`, delete the dead TSX, and limit auth-premium.css to the classes still rendered (lang-switch, activation) |
| L6 | Medium | Medium | premium-clean-manager.css (226 KB, 774 `[data-nv-clean]`; still set for Owner and Manager at app-shell.tsx:378), corp-shell.css (113 KB), portal-premium.css (333 KB), globals.css (374 KB) all load under B | B "wins" only by out-specifying these layers (L1) | Every older rule B forgot is a latent mismatch (C7, C10 and the S6 field radius are examples) | After L1 (layers), audit what B still relies on from these layers. Then stop setting `data-nv-clean` once B covers Owner and Manager completely |
| L7 | Low | Medium | owner-b-pages.css:382 (3,050-character selector); "never nest :has() inside :has()" (DESIGN, Nov 7) | About 465 `:has()` uses across the B layers | One invalid branch drops the whole rule silently | Split mega-selectors into one rule per page pattern |

**Regression-risk summary:**
- **High:** the `!important` and fake-id ladder (L1) and the stored dark theme (L2).
- **Medium:** the desktop duplication (L3), self-overrides (L4), reliance on older layers (L6) and mega-selectors (L7).
- **Low:** removing dead CSS once the import graph is confirmed (L5).

---

## 8. Dropdowns, selects and pickers

**How they are built:**
1. **Native `<select>`** in 29 components (assisted recovery, policy editor, timecards, payroll settings, shift forms, messages-b and others), styled four ways:
   - corp `.c-in` with a data-URI caret (corp.css:175–180)
   - Fix my time `select.c-in` (time.css:172–173)
   - Quiet row selects `.q-select-row__control` (quiet.css:217): 52px, transparent, 17px; desktop 14px (owner-b-desktop.css:307)
   - Quiet rule selects (quiet.css:430): 50px, fill, radius 12
2. **Native select overlaid on a glass chip:** `.eb-select` (account.css:100–104; messages-b.tsx:159–161). The visible span mirrors the value and a transparent select sits on top. This keeps full native keyboard support and has a good focus ring.
3. **Popover menus:** `ActionMenu` (action-menu.tsx), using the popover API. It focuses the first item on keyboard open (lines 99–110), the platform handles Escape, and phones get a sheet. There is no arrow-key roving and no `role="menu"`, which is correct for a disclosure of links. The trigger is `.c-select-btn`, which is 32px/8px radius in corp (corp.css:250), 44px/10px (corp.css:289–295), and a 42px glass pill on the desktop band (owner-b-desktop.css:80).
4. **Custom comboboxes:**
   - `command-finder.tsx`: ArrowUp/Down and Enter; Escape is native through `<dialog>.showModal()`; uses `aria-activedescendant`. It has no Home/End, which is acceptable.
   - `employee-shift-picker.tsx`: full keyboard support, but no importer (dead).
5. **Date and time:** native inputs: 38 `date`, 23 `time` and 10 `datetime-local`.

| # | Sev | Location | Evidence | Impact | Fix |
|---|---|---|---|---|---|
| D1 | Medium | corp.css:175–180, 250, 289–295; time.css:172–173; quiet.css:217, 430, 805; account.css:100–104; owner-b-pages.css:143, 373–374; owner-b-desktop.css:307, 455 | Heights 32 / 44 / 46 / 50 / 52; radius 8 / 10 / 12 / 14; text 14 / 15 / 16 / 17px; field edges drawn as `inset` 1px, 1.5px or none; caret in two weights and colours (I2) | The same "choose one" control looks different on Owner Settings, the Owner Schedule form, Employee Fix my time and Updates | One B select spec: 48px, radius 14, 16px text, 1px edge at the field token (C6), one bold caret 16px in `--b-grey`, focus edge teal 2px. Apply it by element in the shared layer (S6 approach) |
| D2 | Low | owner-b-desktop.css:723 | The placeholder option is shown in `#8C9397` (3.12:1) | Hard to read "Choose…" | `#6A7176` |
| D3 | Low | action-menu.tsx:149, 151 | Menu trigger icons are regular weight, and the caret has no weight | See I1 | `weight="bold"` |
| D4 | Low | employee-shift-picker.tsx | A complete custom listbox that nothing renders | Dead code | Delete it, or adopt it where a searchable select is needed |

Keyboard support is good where it matters: native selects everywhere, a labelled overlay select, a dialog-based finder and a popover menu with first-item focus. **No keyboard blocker found.**

---

## Top 15 fixes, ranked by impact on polish and consistency

1. **One band-text contrast system (C1, C2).** Two tokens (white, and white /.86 on solid band only), white labels on glass, solid white status chips on the hero. This fixes the most-seen AA failures on every main screen.
2. **One band (C8).** A single `--b-band` (`#0C726C → #08504C`) and `--b-band-ink` for the phone kit, phone pages, desktop, auth and Clocker. This removes the hue shift between pages and makes fix 1 pass everywhere.
3. **Promote `--b-*` to `[data-nv-b]` and alias `--c-*`/`--q-*` to it (C7, C10, C9).** Older layers then render B's ink, grey, line and canvas without new overrides, and 1,345 literals can be retired file by file.
4. **Cascade layers instead of the `!important` and fake-id ladder (L1).** This is the largest regression-risk reduction; start with owner-b-shell.css and auth-b.css.
5. **Force light theme (L2).** THEME_SCRIPT always sets `light` and clears `nv-theme`; delete the quiet and signature dark blocks. This removes a possible unreadable state that users can't undo.
6. **Pills everywhere (S1, S4).** `999px` on `.b-btn--full`, `--big`, `.b-ink__btn`, every half-height radius, and chips.
7. **One elevation set (S2, S3, B7).** `--b-elev-1`, `--b-elev-2` and `--b-elev-glow` built from one shadow colour, with notes on the same 22px card.
8. **Touch-size the tablet layer (B1).** 44px minimum (or a hit-area extension) for week steppers, band tabs, back links and band buttons under `pointer: coarse`.
9. **Fix the grey text that fails (C3, C4, C5).** Tab labels and sidebar labels to `#6A7176`; a `--b-grey-on-fill: #5E666B` for grey text on tinted fills.
10. **Status colour discipline (C11, C12, C13).** The Owner desktop bell uses a coral dot or teal count (not red `#C8322B`); done steps are green; Sign out is not red.
11. **Shared desktop B-screen layout (L3).** One block for Owner and Employee desktop; resolve the 13 drifting values once.
12. **One press feel (B2, B3, M1).** Scale 0.96, 150ms ease-out for every B-styled button including `.c-btn`/`.q-btn`, excluding disabled.
13. **Phosphor bold in the shell (I1, I2, I3).** Bold nav and sidebar icons (fill when active), bold desktop bell, one bold `currentColor` caret, three icon sizes (16/18/20), and the same sidebar size for every role.
14. **Collapse the 12–17px type band into a role scale (T1, T2, T3, T4).** Six text sizes with paired line-heights, one sheet-title size, one empty-state title size, and one tabular-figures rule for all widths.
15. **One field and select spec (C6, D1, S6) and one disabled look (B5).** 48px, radius 14, a 1px edge at 3:1, the bold caret; disabled as `#F0F2F3` / `#8C9397` with no scale; hover only under `(hover: hover)` (B4).

**Verdict: Block.** High findings remain: C1–C4, C11, S1, B1, L1 and L2. Coverage that is not verified here (rendered pixels, cascade winners, the effect of a stored dark theme) belongs to the screenshot review.
