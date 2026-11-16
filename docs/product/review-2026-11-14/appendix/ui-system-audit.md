# UI system audit and Nov 11 plan status (code measurement, Nov 14, 2026)

NEVORA UI system audit and Nov 11 plan status (read-only inspection)

Source: /Users/josek0514/Desktop/NEVORA-CLAUDE-CODEX-COLLAB, branch claude-codex-collab-nevora, HEAD ce4de4bc. All paths below are relative to that root. I created, edited and deleted nothing, and ran no install, build, test or state-changing git command. Untracked `zz-scan/` and `vitest.zz-scan.config.mts` appeared in `git status` during the run; they belong to another session. Release sequence per Jose's policy is unchanged: development is the acceptance release, then the exact verified release is promoted to main after his approval; nothing here was deployed.

**Headline:** the Nov 11 plan has not been started in code. Of 59 findings spot-checked (all 38 High plus 21 Medium/Low), 0 are fixed, 0 partly, 56 are still present and 3 cannot be judged without a rendered screen. The Direction B foundation numbers match the Nov 11 review almost exactly.

## A. Plan status

Git evidence: this branch's first-parent history is 4 commits. `b9a2f696` (Nov 14) is a parentless snapshot of the whole tree (16,557 files); `73767e9c` merges development (unrelated history, no merge base); the other two are docs. `git log --since=2026-11-11 -- 'src/**/*.css'` returns only the snapshot. The merge touched 49 UI files (135+/193−), all unused-import cleanup. The only UI commits since Nov 11 are Codex's (for example `d2180f7c` billing and tablet recovery screens).

| Phase | Status | Evidence |
|---|---|---|
| Step 0, save inspection | Partly | `docs/product/review-2026-11-11/` has README, PLAN, backend-gaps and six reviews. Missing: merged `findings.json`, `status.json`, CK and XP reviews (README.md:23). The backup branches named at README.md:61-64 are not in this clone (`git branch -a` shows 3 refs). |
| 1 Foundation | Not started | `src/app/b-tokens.css` still has 5 type roles, no spacing tokens, no small radius, no enter-motion token. Measured B-set values equal the review's (18px ×208, 22px ×154, 14px ×128). `b-foundation.css:180` press scale still ungated. |
| 2 Shared patterns | Not started | Per-row teal pills (`owner-b/inbox-b.tsx:158-159`); offline strip (`app-shell.tsx:554`); no rail labels (`b-foundation.css:24-25`); "Pending" (`manager-time-corrections.tsx:89`). |
| 3 Owner/Manager | Not started | OW-001…008 and MG-001…004 all present (table below). |
| 4 Employee/Lead | Not started | EM-001…005 all present. |
| 5 Signed-out | Not started | PB-001…010 present; `src/app/page.tsx` still redirects to `/app` (home option A not built). |
| 6 Clocker | Not started | `clocker-pin-gate.tsx:102` sends `{action:'verify',pin}` with no employeeId; no "Try again at" or "Your PIN is paused" strings; no `limitScope`, `retryAfterSeconds` or `otherCount` use. `clockerErrorText` exists (`clocker-copy.ts:290`). DESIGN.MD:1650 still says "No lockout countdown". |
| 7 Motion | Not started | No sheet or menu enter/exit rules added; durations unchanged. |
| 8 Verification | Not started | No `status.json`; screenshots not in repo. |

Nov 10 review (`review-2026-11-10/status.json`, 329 findings): 298 fixed, 25 partly, 6 open. By severity: High 61/5/1, Medium 150/15/4, Low 87/5/1. Open: NV-038 (High, push payloads, Codex), NV-079, NV-142, NV-156, NV-212, NV-328. Most "partly" items wait on Codex reads. NV-066, NV-229 and NV-236 are partly because the older eras remain.

Spot-check (status now; evidence):

| ID | Finding | Status | Evidence |
|---|---|---|---|
| SY-001 | 46 text sizes; role tokens unused | Still | B set: 22 fixed px sizes, 13px ×35, 15px ×76; `--b-fs-*` read 4 times |
| SY-004 | Spacing off the 4-grid | Still | B set 51% on grid |
| SY-005 | Card header 44/46/52 | Still | `owner-b.css:158`, `employee-b.css:133`, `employee-b-desktop.css:49` |
| SY-006 | Colour literals instead of tokens | Still | B set 74 hex / 594 uses, 268 are #FFFFFF |
| SY-009 | 28 radii, tokens unread | Still | `--b-radius-card` read 3 times vs 22px literal ×75 |
| SY-010 | Menu 16px with 8px items | Still | `b-foundation.css:404-405` |
| SY-011 | 90 shadows | Still | B set 104 distinct; `--b-elev-1` read 6 times |
| SY-012 | Icons draw regular | Still | 309 of 678 unweighted |
| SY-014 | Five button families | Still | `owner-b.css:143` (36px/14px base) |
| SY-015 | nv-btn has no B rule | Still | 0 matches for `nv-btn` in b-foundation, owner-b-desktop, owner-b-pages; exclusions remain at `owner-b-pages.css:134` |
| SY-018 | Press ignores reduced motion | Still | `b-foundation.css:180` |
| SY-021 | Opacity as disabled | Still | `clocker.module.css:188,199,249` |
| SY-022 | Nine state patterns | Still | counts in section B |
| SY-023 | Empty kind defaults to a warning glyph | Still | `b-kit.tsx:201` |
| SY-024 | Tokens bypassed | Still | `--b-dur-press` read 2 times, `--b-radius-pill` 5 |
| OW-001 | Teal pill on every request row | Still | `inbox-b.tsx:158-159` |
| OW-002 | Repeated row titles | Still | `action-center/intelligence.ts:256`, `notification-inbox-view.ts:32` |
| OW-003 | Formats disagree | Still | `duration-format.ts` exports only durationSentence, durationRow, durationTotal |
| OW-004 | Seam in Time corrections band | Still | `timecards/corrections/page.tsx:30-31` |
| OW-005 | Two Prepare buttons | Cannot tell | `payroll-runs.tsx:161-269`; needs a render |
| OW-006 | Coverage tile | Still | `coverage-minutes.tsx:24-33` |
| OW-007 | 32px avatar vs 36px icon lead | Still | `home-b.tsx:132` `size={32}` |
| OW-008 | Offline strip splits band | Still | `app-shell.tsx:554` `.c-offline` |
| OW-014 | "Pending" vs "Waiting" | Still | `manager-time-corrections.tsx:89` |
| OW-019 | "Try again" twice | Still | `notification-inbox.tsx:91,157` |
| OW-020 | "Loading update…" over empty canvas | Still | `communication-detail.tsx:56` |
| MG-001 | Closed page older card on desktop | Still | `owner-only-notice.tsx:33` (CorpEmpty, "Back to Home") |
| MG-002 | Closed page dead end | Still | `payroll-route.tsx:25`, `settings/layout.tsx:13` pass no `next` |
| MG-003 | Payday card vs approval window | Still | `home-b.tsx:154,165` |
| MG-004 | Own timecard in the to-approve list | Still | `timecards.tsx:87,463,843,870` |
| MG-008 | "No notifications yet" while items wait | Still | `notification-inbox.tsx:112-114` |
| MG-009 | One generic Settings notice | Still | `settings/layout.tsx:13` |
| EM-001 | Availability card clips band | Still | `employee-b-desktop.css:671` |
| EM-002 | Required to-dos cut on phone | Still | `employee-b/home-b.tsx:233` |
| EM-003 | Pay card has no state | Still | `pay-b.tsx:147-149` |
| EM-004 | Two teal pills; "See" | Still | `schedule-b.tsx:115` |
| EM-005 | Category-name notifications | Still | `portal-notification-list.server.ts:16`; `messages-b.tsx` has no `subject` |
| EM-011 | Pay band near-black | Still | `owner-b-desktop.css:887` |
| EM-019 | 404 uses failed kind | Still | `app/app/not-found.tsx:16` |
| EM-020 | Language switch is a rectangle | Still | `employee-b/account.css:190-191` |
| TB-001 | Rail has no labels | Still | `b-foundation.css:24-25` |
| TB-002 | Chip clipped in day block | Cannot tell | `employee-b-desktop.css:417-419,480-482`; no short-form rule found |
| TB-003 | 148px person column wraps | Still | `employee-b-desktop.css:568` |
| TB-004 | Desktop-height bands on tablets | Still | `owner-b-desktop.css:847-863` has no band rule |
| TB-012 | "Ctrl K" on touch | Still | `command-finder.tsx:153` |
| PB-001 | Policy pages English only | Still | `support/page.tsx:34` |
| PB-002 | "Invitation verified" before any check | Still | `auth-copy.ts:122,261` |
| PB-003 | Activation success: no mark, ID not carried | Still | `activate/activation-invitation.tsx:93-99` |
| PB-004 | "Request received" | Still | `recovery-request.tsx:30`, `auth-copy.ts:63` |
| PB-005 | Session end gives bare /login | Still | `lib/auth/session.ts:125,133,135` |
| PB-006 | Wrong password clears the ID | Still | `login/actions.ts:29,46` |
| PB-007 | Activate page is a dead end | Still | `activation-invitation.tsx:116-121`, `auth-copy.ts:115` |
| PB-008 | 43-character code, no QR | Still | `assisted-recovery.tsx:64` |
| PB-009 | English after Spanish sign-in | Still | `app/app/page.tsx:81` `lang="en"` |
| PB-010 | No front door | Still | `src/app/page.tsx` |
| PB-019 | "Buenas noches" from 5 PM | Still | `auth-premium/greeting.tsx:9-11` |
| PB-020 | Browser language ignored | Still | `lib/auth-lang.server.ts:5-9` |
| PB-021 | Sub-pages drop the wordmark | Cannot tell | `auth-back-nav.tsx:10-16` (wordmark only when `lang` is passed) |
| PB-025 | Public error English only | Still | `public-error-screen.tsx:18` |

Jose's attendance words: "Not clocked in" appears in 5 files; "Clocked in late" in 0; Team still says "Late" (`owner-b/team-b.tsx:59`).

## B. Measured audit

Method: Python regex over `src/**/*.css` with comments stripped (171 files); TSX counts exclude tests and `ui-preview`. "B set" is 15 files: b-tokens, b-foundation, owner-b-shell/pages/desktop, employee-b-desktop, `components/owner-b/*.css`, `components/employee-b/*.css`, auth-b.css, clocker.module.css. rem and `calc(N * var(--type-unit))` are converted to px.

**CSS architecture**

| Measure | Value |
|---|---|
| CSS in src | 171 files, 3,801,128 bytes, 42,546 lines. Largest: globals.css 369 KB, portal-premium 301 KB, premium-clean-manager 220 KB, owner-b-desktop 159 KB, corp-shell 101 KB |
| Loaded on every /app route | 7 sheets from `src/app/layout.tsx` (502 KB) + 35 from `src/app/app/layout.tsx` (1,846 KB) = about 2.29 MB raw, in era order |
| `!important` | 6,988 in 68 files: owner-b-desktop 1,778, employee-b-desktop 1,027, corp-shell 903, owner-b-pages 803, corp-employee-bridge 554, auth-b 543, b-foundation 427, globals 168 |
| `@layer` | Only `nv-b`, in 17 files. B8 holds for the B app sheets (49 `!important` outside the layer across them). auth-b.css (543) and corp-shell.css (903) are unlayered |
| Fake-id ladders | `:not(#…)` 2,888; `:is(#c-root…` 4,480; `:has(` 1,220 |
| Width breakpoints | 98 distinct. Legacy 760/761px: 359 uses. B 767/768px: 303 uses |
| Never-imported sheets | 15 files, 161 KB: availability/availability.css, my-time/my-time.css, notifications.module.css, profile/profile-signature.module.css, profile/profile.css, requests/hub/request-hub.css and .module.css, requests/time-off.css, forgot-access/recovery.css, login/auth-support.css, reset-access/reset.css, availability-signature.module.css, employee-my-schedule.module.css, employee-updates-signature.module.css, shift-requests-signature.module.css |
| Unreferenced class names | About 1,557 of 4,453 (35%) in non-module CSS appear in no TS/TSX. Worst: employee-* 121/248, wc-* 117/198, cm-* 103/198, manager-* 58/116, wa-* 56/127. Static estimate; dynamic class names can hide uses |
| Dark-mode leftovers | 274 `nv-theme`/`data-theme` references (corp-shell 144, portal-device-setup 36, owner-b-shell 29), though the brand is light only |
| Unused dependencies | `gsap` 3.15.0 and `@gsap/react` 2.1.2 in package.json; zero imports in src |
| Root tokens | `typeface-theme.css:43-58` still defines the retired orange palette on `:root` (`--design-primary: #ED724C`, 18/17px radii); correct only because `corp-shell.css:140-150` overrides it |

Generations and where they render (from imports and class names; not rendered):

| Generation | Files | Routes |
|---|---|---|
| Fuel/portal legacy | globals.css, portal-*.css, mobile-workforce.css | Base under everything; `EmptyState`/`.nevora-empty` in locations, breaks, positions, manager inbox, weekly roster |
| Premium waves (wa-/wb-/wc-) and nv-kit | premium-wave-a/b/c.css, kit/kit.css | wc-: /app/settings/branding, breaks, clocker, company-policies, features, locations (3), positions, workspace; account-recovery, clocker-recovery, account/delete. wb-/nv-: /app/reports, schedule/settings, schedule/templates, settings/payroll, updates/[id], updates/compose. wa-/nv-: schedule/new, schedule/copy-receipt, employees/[id]/clocker-pin. nv- only: /app/ai-manager (flag-gated) |
| Clean manager v3 (cm-) | premium-clean-manager.css, clean-manager/*.css | Schedule week grid, Timecards table, Insights; `data-nv-clean` still set for Owner and Manager (`app-shell.tsx:434`) |
| Quiet (q-) | quiet/quiet.css, quiet-shell.css | All signed-out pages (markup); sheets (QuietSheet); many manager forms |
| Corporate (c-) | corp/corp.css, corp-shell.css, bridges | Timecards, Payroll (6 routes), Team list and person, Time exports, corrections, publish, coverage, Settings hub |
| Signature (sig-) | signature/tokens.css, components.css | /app/billing, /pages/plans, /pages/nevora-billing, /pages/nevora-billing-return, /pages/es-facturacion, /pages/es-pago, /clocker/access/paused (all via `commerce-recovery/recovery.module.css`) |
| Direction B native | owner-b/*, employee-b/*, clocker.module.css | Owner/Manager Home, Things to do, Team (phone); every Employee and Lead screen; in-app 404; closed-page notice on phones; Clocker kiosk |
| Direction B overlay only | owner-b-pages.css, owner-b-desktop.css, b-foundation.css, auth-b.css | Every other row above |

This verifies and extends the README list. The README is right about billing, the delegated correction, `/pages/*` and the paused Clocker page. Not listed there: the eleven Settings pages, Insights, Scheduling rules, Week templates, Payroll settings and Update detail/compose are still older markup under an overlay. The delegated correction form uses `c-field`/`c-btn` plus `management-close-form.module.css`.

**Typography**

| Measure | All src | B set |
|---|---|---|
| font-size declarations | 3,117 | 461 |
| Distinct values | 122 (41 fixed px, 38 clamp/min/max, 227 via var) | 34 (22 fixed px) |
| Most used | 13px ×559, 15px ×437, 12px ×373, 14px ×325, 11px ×177, 17px ×127, 16px ×123, 10px ×80 | 15 ×76, 14 ×66, 13.5 ×58, 14.5 ×40, 13 ×35, 15.5 ×25, 12 ×22 |
| Below 12px | 8 to 11.5px: 354 declarations | none |
| Weights | 31 distinct: 600 ×820, 500 ×377, 700 ×122, 400 ×116, plus 550, 620, 650, 720, 750, 800, 850, 900, one 200, two 300 | 600 ×173, 700 ×89, 500 ×24, 400 ×3 |
| Line-heights | 84 distinct (18px ×287, 20px ×280, 1.5 ×161, 1.6 ×112) | 37 (21px ×33 and 19px ×29 are off-role) |
| Letter-spacing | 77 distinct values | — |

Fonts per surface, as coded:
- **Signed-in app:** Inter. `typeface-theme.css:14-21,57`; clean manager's system stack (`premium-clean-manager.css:8`) is overridden to Inter under `data-nv-corp` (`:22`), which is always set (`app-shell.tsx:450`).
- **Sign-in and public pages:** Inter, forced with `!important` (`auth-b.css:183,222`).
- **Clocker:** Inter under a second name, 'Nevora Clocker' (`clocker.module.css:7,34`).
- **Commerce pages (billing, /pages/*, paused Clocker):** system font, through `--sig-font` (`signature/tokens.css:58`, `recovery.module.css:3,5,14`).
- **JetBrains Mono:** hex and code inputs (`premium-wave-c.css:325,349,453`), payroll-export and employee directory.
- Inter is declared in 6 `@font-face` blocks from 4 font files.

TEAM-RULES' "system font" statement is false for every surface except the commerce pages.

**Colour**

| Measure | All src | B set |
|---|---|---|
| Distinct hex in declaration values | 501 (3,494 uses; 2,883 written directly in properties) | 74 (594) |
| Distinct rgb()/rgba() | 283 (782 uses) | 71 (274) |
| var() uses | 14,146 across 791 variables; 832 custom properties defined | 1,061 |
| Near-neutral hexes | 236 (137 lighter than #E0E0E0) | 35 |
| Dark and mid teals | 46: #0B6E69 ×163, #077572 ×40, #0C726C ×29, #0B3B38 ×28, #055C5A ×27, #08504C ×27, #0B6B67 ×22, #0D3634 ×16, #07605F ×10 | — |
| Canvas values | #F5F6F6 ×34, #F2F5F4 ×18, #FAFAFA ×14, #F7F6F3 ×10, #F2F2F7 ×4, #F6F6F8 ×3 | #F2F5F4 |

Token families by var() uses: `--nv-*` 2,706, `--type-*` 1,350, `--design-*` 1,197, `--em-*` 1,163, `--b-*` 918, `--c-*` 829, `--sg-*` 686, `--g-*` 574, `--color-*` 560, `--sig-*` 552, `--cm-*` 535, `--q-*` 344, `--corporate-*` 285, `--nevora-*` 156, `--nuvora-*` 153, `--mh-*`, `--mobile-*`, `--s6-*`, `--ck-*` 105, and about 25 more. `owner-b.css:89` keeps a second copy of the `--b-*` palette.

Status ladder: B chips are consistent (`owner-b.css:214-218`). Across layers they are not:
- Done shown teal: `--nv-done-ink: #0B6E69` (`corp-shell.css`, corporate token block); `employee-requests-corp.tsx:29,38` ("Approved", "Completed"); `employee-schedule-corp.tsx:210` ("Confirmed"); `employee-b/time-b.tsx:82` ("Clocked in").
- Done shown green: `.c-pill--green` (`corp.css:96`); `manager-time-off.tsx:190`; Published on Schedule; the Clocker's "Clocked in" per DESIGN.MD:1654.
- Waiting is amber in code (`employee-requests-corp.tsx:29`), "Pending" in `manager-time-corrections.tsx:89`, and grey in TEAM-RULES.md:81-82.
- Three reds are documented: #B42318 (code), #A3271A (TEAM-RULES.md:85), #E1553F (DESIGN.MD:40).

**Spacing, radius, elevation**

| Measure | All src | B set |
|---|---|---|
| Spacing value uses | 10,036; 76 distinct | 1,609; 45 distinct |
| On a 4-grid (plus 2) | 65% | 51% |
| On the plan's scale | 63% | 48% |
| Top off-grid | 10 ×599, 14 ×595, 6 ×556, 18 ×534, 22 ×269, 3 ×115, 5 ×114, 7 ×109 | 18 ×208, 22 ×154, 14 ×128, 6 ×122, 10 ×98 |
| Radius | 2,318 declarations, 87 distinct. Top: 0 ×322, 12px ×238, 8px ×192, 22px ×133, 50% ×130, 10px ×126, 14px ×116, 16px ×97, 999px ×97, 18px ×95, 20px ×78 | 419 declarations, 33 distinct: 22 ×75, 14 ×41, 999 ×32, 16 ×29, 18 ×27, 21 ×21, 20 ×19 |
| In the approved set (999/22/14/10, 0, 50%) | 41% | 52% |
| box-shadow | 1,569 declarations; 415 distinct non-none (1,005 uses); 136 are pure var(); 29 shadow base colours | 104 distinct; 10 base colours (rule says one: 16 40 38) |

The older 12/8px corporate geometry still outnumbers 22/14 in the source. There is no token for the 10px small radius and no spacing token at all.

**Components**

| Pattern | Families (class uses / files in TSX) | Files |
|---|---|---|
| Buttons | b-btn 57/13 and BButton 44/11; c-btn 285/39 and CorpButton 54/15; q-btn 223/49; q-bs 30/13; nv-btn 107/33; wc-btn 5/1; sig-btn 3/1; Clocker `.btn`; commerce `.action`/`.secondary` | `owner-b/b-kit.tsx`, `corp/corp.tsx`, `quiet/quiet.css:117,123`, `kit/kit.css:239`, `signature/sig-button.tsx`, `clocker.module.css:181`, `commerce-recovery/recovery.module.css:14` |
| Base geometry | b-btn 36px/pill; c-btn 44px/8px; q-btn 50px/12px; q-bs 32px/16px; auth 52px/26px in #0C726C; commerce 48px/16px in #0D3634; Clocker pill, 17px/700 | `owner-b.css:143`, `corp.css:114`, `auth-b.css:70` |
| Rows | b-row 37 + BRow 83; c-row 77 + CorpRow 114; q-row 214 + QuietRow 48; nv-row 11; 5 tables | same kits |
| States | BState 17/12; RouteSkeleton 30 of 44 loading.tsx; c-empty 31/14; q-empty 39/19; EmptyState 7/6; wc-skeleton 10/4 and Settings loaders in 15 loading.tsx; c-error 44/21; q-error 15/13; c-skel 31; SystemState 2 | `b-kit.tsx:196-214`, `empty-state.tsx`, `settings/wave-c-loading.tsx`, `signature/system-state.tsx` |
| Sheets and dialogs | `<dialog>` in 9 files; QuietSheet 9/7; c-sheet 13/6; cm-*sheet 10/2; popover attribute 22/9; no B sheet | `quiet/quiet-sheet.tsx`, `signature/sig-overlays.tsx`, `command-finder.tsx` |
| Tabs and segments | BSeg 6; QuietSegments 2 and q-seg 5; CorpTabs/c-tabs 13/9; wc/wb tabs 5; eb-lseg 1; 0 `role="tablist"` | `b-kit.tsx`, `corp.tsx`, `employee-b/account.css:190` |
| Fields | c-field 41/19; wb-field 13/4; sig-field 9; wa-field 3; wc-control 3; raw `<input>` 315/105, `<select>` 73/27; no b-field | — |
| Chips | BChip 50 + b-chip 18; CorpPill 51; `.sg-pill` | — |

Five React kits coexist: b-kit (21 exports, 31 importing files), corp (36 exports, 70 files), quiet (25 files), kit/nv (16), signature (1), plus wave-a parts (17).

**Icons**

| Measure | Value |
|---|---|
| Phosphor elements | 678: bold 350, no weight (draws regular) 309, fill 7, duotone 7, regular 4 |
| By surface | employee-b 95 bold / 0 unweighted; owner-b 29/1; public and auth 42/14; Clocker 5/8; older kits 9/13; legacy page components 164/271 |
| Worst files | communication-compose.tsx 24, communication-detail.tsx 17, reports.tsx 13, employee-mobile/pay.tsx 13, notification-inbox.tsx 9, calendar-subscription-panel.tsx 9, employee-time-panel.tsx 9 |
| Sizes | 19 distinct size props (18 ×130, 20 ×81, 16 ×44, 22 ×28, 24 ×17, 28 ×13, then 10–32); 327 have no size prop |
| Other sources | 15 inline `<svg>` in 10 files (brand mark, signature, select caret, passkey); no emoji; "✓" character twice |

**Motion**

| Measure | Value |
|---|---|
| Declarations | 432 transition, 84 animation, 43 keyframes |
| Durations | 26 distinct: 180ms ×84, 140 ×62, 150 ×57, 160 ×52, 120 ×43, 200 ×26. B set: 150 ×21, then 120, 300, 160, 200 |
| Easing | `ease` ×201, `ease-out` ×110, `linear` ×23, 8 cubic-beziers (45 uses) |
| Press scale | .98 ×11 and .96 ×9 in older sheets |
| Reduced motion | 139 queries; 14 of 92 motion sheets have none (corp-employee-bridge, employee-b-desktop, schedule-corp, employee-b.css, employee-b/schedule.css, timecards-corp, reports-corp, owner-home-corp, employee-home-corp, team-overview, schedule-shift-form, calendar-subscription-panel, plus two dead files) |
| Good | No `transition: all`; no `will-change` |
| Focus | 55 distinct visible outline values in 12+ colour tokens, including `--nevora-blue`, `--login-blue` and orange `--design-accent-ink`; `--b-focus*` read 17 times |
| Disabled | 99 `:disabled` rules use opacity |
| z-index | 26 distinct, up to 2,147,483,000 |

## C. Document contradictions

| Topic | Says A | Says B | In code |
|---|---|---|---|
| Which direction is current | Direction B everywhere: DESIGN.MD:356-367, `.21st/DESIGN.md:3-6` | Signature for Employee, sign-in and Clocker; clean manager v3 for Owner/Manager: TEAM-RULES.md:6-15, 39-40. DESIGN.MD:2 still says `version: "nevora-signature-2026-10-20"` and :55, :192, :208 mark Signature values "CURRENT" | Direction B |
| Font | Inter: DESIGN.MD:4, :371; review README.md:54; PLAN.md:123 | System font, "keep each surface on the font it uses": TEAM-RULES.md:89-92; DESIGN.MD:55-58, :97-99 | Inter, except commerce pages |
| Icon weight | Bold: DESIGN.MD:371, :1701; README.md:54 | Regular, fill only for the active tab: TEAM-RULES.md:18-19, :88; DESIGN.MD:482 | 52% bold, 46% regular |
| Band | Teal #0C726C to #08504C around #0B6E69: DESIGN.MD:369, :1677 | Deep #0D3634, never recoloured: TEAM-RULES.md:16, :100; DESIGN.MD:16, :209-212 | Teal; #0D3634 on commerce pages |
| Canvas | #F2F5F4: DESIGN.MD:370; README.md:54 | #F7F6F3: TEAM-RULES.md:17; DESIGN.MD:7 | Six canvas values; corporate token is #F5F6F6 |
| Primary button | Teal pill: DESIGN.MD:1689 | Deep #0D3634, radius 16: TEAM-RULES.md:84; DESIGN.MD:219-224 | Four fills, eight geometries |
| Status ladder | Red stop, amber wait, green done, teal information: DESIGN.MD:372, :1381 | Grey waiting, amber review, green done, coral urgent: TEAM-RULES.md:81-82 | Mixed |
| "Done" colour | Green: DESIGN.MD:372 | "Open decision", teal today: TEAM-RULES.md:20-21, :85-87 | Both |
| Bell unread mark | Coral dot at every width: DESIGN.MD:1686 | Phone bell is a teal numbered badge: DESIGN.MD:1821 | Badge on phones |
| Clocker lockout | No countdown: DESIGN.MD:1650 | Show the real clock time: README.md:31; PLAN.md:109-112 | No countdown |
| Type roles | Five roles: DESIGN.MD:1703 | Eight roles: PLAN.md:60 | Five tokens, read 4 times |
| Theme | Light only: DESIGN.MD:1702 | "light and dark readiness": `.claude/agents/ui-designer.md:3,36` | 274 dark selectors remain |
| Which doc to read | "Read DESIGN.MD and `.21st/DESIGN.md` … current approved baseline": project CLAUDE.md | `.21st/DESIGN.md:3-6` says it is superseded history | — |
| Legacy contract | Blue #0756D9, canvas #F6F6F8, no superseded banner: `docs/ui/fuel-ui-contract.md:7` | Teal brand | #0756D9 still 12 uses |

## D. Findings (most severe first)

No release blocker is provable from source alone. UI-2 becomes one if billing is switched on for customers before it is rebuilt; that is Jose's call.

| ID | Finding | Type | Evidence | Role / surface | Customer impact | Severity | Recommended improvement | Effort, dependencies | Owner | Already addressed? |
|---|---|---|---|---|---|---|---|---|---|---|
| UI-1 | Nov 11 plan not started; no tracking file | Observed defect (process) | Section A; 0 of 59 fixed | All | Every reviewed defect still ships | High | Create `status.json` from the six review files, save CK/XP reviews, start Phase 1 | S for tracking | Claude; Jose for priority | Partly (Step 0) |
| UI-2 | Billing, plans and paused-Clocker pages render the retired Signature look: system font, #F7F6F3, deep #0D3634 16px button, text "NEVORA" in place of the wordmark | Observed defect | `commerce-recovery/recovery.module.css:1-24`, `frame.tsx:4`, `clocker/access/paused/page.tsx` | Owner, public, kiosk | The money pages look like a different product | High | Rebuild on the sign-in frame (band, 22px card, pill) reading `--b-*` | M; keep Codex's contracts | Claude | Partly (README lists them; no phase owns them) |
| UI-3 | Four documents disagree on font, icon weight, band, canvas, status ladder, primary button and lockout | Observed defect (docs) | Section C | Every agent and session | Agents following TEAM-RULES build the wrong brand; UI-2 is an instance | High | One token table at the top of DESIGN.MD; TEAM-RULES and the agent files point to it; fix the front-matter; banner on fuel-ui-contract | S | Jose decides the ladder and "done"; Claude edits | No |
| UI-4 | Direction B is an `!important` overlay over five older generations | Observed defect | 3.80 MB CSS; 2.29 MB on every /app route; 6,988 `!important`; 7,368 fake-id selectors | All signed-in | Slow first load on phones; each fix risks a regression elsewhere | High | After Phase 1, move pages to B kit markup one at a time and drop each page's legacy rules | L; needs a visual-diff harness | Claude | Partly (B8 rule; NV-236 audit). No retirement phase |
| UI-5 | Nine button families, eight base geometries, four primary fills; `nv-btn` (107 uses) has no B rule | Observed defect | Components table; SY-015 evidence | All | Square and pill buttons, and three teals, appear on one journey | High | One `BButton` (48/40/32); map the rest; delete class families once at zero | M | Claude | Yes, Phase 1 (SY-014, SY-015) |
| UI-6 | 46% of icons draw regular weight | Observed defect | 309 of 678; files above | Updates, Insights, Pay, Notifications, payroll | Thin and bold icons on the same screen | High | A wrapper that defaults to bold, or a codemod; lint rule | S–M | Claude | Yes, Phase 1 (SY-012) |
| UI-7 | Press animation ignores reduced motion; 14 motion sheets have no reduced-motion query | Observed defect | `b-foundation.css:180`; list in section B | All | Motion-sensitive users get scale animation; breaks DESIGN.MD B1 | High | Gate the scale behind `prefers-reduced-motion: no-preference`; audit the 12 live sheets | S | Claude | Yes, Phase 1 (SY-018) |
| UI-8 | Clocker decisions (Employee ID + PIN, lockout clock time) not built | Observed defect | `clocker-pin-gate.tsx:102`; DESIGN.MD:1650 | Kiosk | Approved sign-in and lockout behaviour is missing | High | Phase 6 as written | M; Codex contract delivered | Claude | Yes, Phase 6 (not started) |
| UI-9 | Same state, different colour and word across layers | Observed defect | Status ladder paragraph in section B | Employee, Manager | "Approved" is teal on one screen and green on another | High | Fix the ladder in one table; one status-chip mapping; remove `--nv-done-*` teal | S–M | Jose decides; Claude | Partly (Phase 2 vocabulary; OW-014) |
| UI-10 | 41 fixed text sizes, 31 weights, 84 line-heights; 13px and 15px are 996 declarations outside any role | Observed defect | Typography table | All | Uneven hierarchy; half-pixel neighbours | High | Eight roles as tokens; write sizes only through them | M | Claude | Yes, Phase 1 (SY-001, SY-002); B set only |
| UI-11 | Nine state patterns; 15 of 44 loading screens use the older skeleton | Observed defect | Components table | Settings and manager pages | Loading, empty and error look different page to page | Medium | Everything through `BState`/`BLoadingScreen` | M | Claude | Yes, Phase 1 (SY-022, SY-023) |
| UI-12 | Three row systems (b 120, c 191, q 262 uses) | Observed defect | Components table | All lists | Row heights, insets and chevrons differ | Medium | One row spec; make CorpRow and QuietRow render it | M | Claude | Yes, Phase 1 (SY-016) |
| UI-13 | 501 hex and 283 rgb literals; 45+ token families; 236 near-neutral greys; 46 teals | Observed defect | Colour table | All | Subtle mismatched greys and teals | Medium | One `--b-*` table; alias the families; fold near-duplicates | M for B set, L for all | Claude | Partly (Phase 1 SY-006, SY-007 cover B only) |
| UI-14 | Spacing 65% on grid (B set 51%); no spacing tokens | Observed defect | Spacing table | All | Uneven rhythm | Medium | Add scale and three inset tokens; fold off-grid values | M | Claude | Yes, Phase 1 (SY-004, SY-005) |
| UI-15 | 87 radius values; 12/8px outnumbers 22/14; no 10px token | Observed defect | Radius table | All | Mixed corner language | Medium | Four radius tokens; replace half-height pills with 999 | M | Claude | Yes, Phase 1 (SY-009, SY-010) |
| UI-16 | 415 distinct shadows, 29 shadow colours | Observed defect | Elevation table | All | Uneven depth | Medium | Three elevations plus glow, as tokens | S–M | Claude | Yes, Phase 1 (SY-011) |
| UI-17 | Settings (11 pages), Insights, Scheduling rules, Week templates, Payroll settings and Update detail/compose are Wave B/C markup under the overlay | Observed defect | Generations table | Owner, Manager | Most likely place for off-brand details | Medium | Add them by name to Phase 3; rebuild with the B kit | M–L | Claude | Partly (Phase 3 names "Settings sub-pages" only) |
| UI-18 | Sign-in uses its own button and 543 unlayered `!important` | Observed defect | `auth-b.css:70,183,222` | Public | Sign-in primary differs from the app's | Medium | Read `--b-band`, the pill radius and focus pair from b-tokens | S–M | Claude | Partly (DESIGN.MD:1713 "still to adopt"; Phase 5) |
| UI-19 | Dead weight: 15 unimported sheets, about 35% unreferenced classes, unused GSAP, dark selectors, orange root palette, six Inter declarations | Observed defect | Architecture table | All (performance) | Larger downloads; misleading code | Medium | Delete the 15 files and GSAP first (each with a route diff), then prune classes per retired page | S, then M | Claude | No (B8 warns against wholesale deletion; nothing schedules it) |
| UI-20 | Two phone breakpoints: legacy 760/761 and B 767/768 | Observed defect (potential) | 359 vs 303 uses | Small tablets, 761–767px windows | Possible mixed layout in that 7px band; not rendered | Medium | Check at 764px; move legacy queries to the `b-viewport.ts` values | S to test | Claude | Partly (B8 covers B only) |
| UI-21 | 55 focus-ring styles, some in retired blue and orange tokens | Observed defect | Motion table | Keyboard users | Inconsistent focus visibility | Medium | One focus pair from `--b-focus*` | S–M | Claude | Partly (SY-024) |
| UI-22 | 99 disabled rules use opacity | Observed defect | `clocker.module.css:188,199,249` | Clocker, Employee | Faded controls can fail contrast | Medium | Use the disabled pair tokens | S | Claude | Yes, Phase 1 (SY-021) |
| UI-23 | No guard keeps the numbers from drifting back | Proposed feature | No stylelint config found; token reads in single digits | All | Gains erode | Medium | Add a token lint and a CI count budget using the scripts in this audit | S–M | Claude | No |
| UI-24 | Which "done" colour, and whether waiting is grey or amber | Design preference | TEAM-RULES.md:20-21, :81-82 vs DESIGN.MD:372 | All | Blocks UI-3 and UI-9 | Medium | Recommend green done, amber waiting, teal information only | S | Jose | No |
| UI-25 | z-index up to 2,147,483,000; 26 values | Observed defect | Motion table | Overlays | Stacking bugs are hard to reason about | Low | A five-step z scale | S | Claude | No |

Ordered steps:

1. **Settle the source of truth** (S; UI-3, UI-24). One token and ladder table at the top of DESIGN.MD; correct TEAM-RULES.md lines 6-25 and 78-101; remove "CURRENT" from the Signature front-matter. Not in the plan.
2. **Finish Step 0** (S; UI-1): `status.json`, CK and XP reviews.
3. **Run Phase 1 as written** (M; UI-5, 6, 7, 10–16, 21, 22), starting with the three one-line or mechanical wins: the reduced-motion gate, the icon-weight wrapper, the `nv-btn` rule. Extend `b-tokens.css` with the eight type roles, the spacing scale, a small radius and motion tokens.
4. **Add a lint and count budget** (S–M; UI-23) so Phase 1 holds. Not in the plan.
5. **Delete what is provably unused** (S; UI-19): the 15 unimported sheets and GSAP. Not in the plan.
6. **Rebuild the commerce pages** on the sign-in frame (M; UI-2). Belongs in Phases 3, 5 and 6 per the README.
7. **Phases 2–6 as written**, with the Wave B/C pages named in Phase 3 (UI-17) and auth tokens in Phase 5 (UI-18).
8. **Retire generations** page by page after each phase (L; UI-4): drop `data-nv-clean`, then Wave, then Quiet sheets. Only the NV-236 audit exists for this.

## E. Not verified from source

- I did not see a single rendered screen. Everything is from CSS, TSX and docs. "Still present" means the code at the finding's location is unchanged, not that I saw the defect.
- The cascade decides what a person sees, and I did not resolve it. Per-surface font and colour statements come from token definitions and override order.
- Route-to-generation mapping is from imports and class names two levels deep. Pages that draw both a B screen and a corporate layout are listed by markup, not by which one is visible at a given width.
- The unreferenced-class figure (35%) and the 15 "never imported" sheets are static estimates; dynamic class names or imports would hide a use. Check each with a route diff before deleting.
- Contrast ratios, touch-target sizes, the 761–767px behaviour, TB-002, OW-005 and PB-021 need a browser.
- My B set is 15 files; the Nov 11 reviewer's set differed slightly (for example 461 vs about 520 font-size declarations), so compare trends, not exact totals.
- CK and XP findings do not exist in the repo, so the Clocker and missed pages were checked only against Jose's three decisions.
- I did not load any of the optional skills; the audit is measurement only.
