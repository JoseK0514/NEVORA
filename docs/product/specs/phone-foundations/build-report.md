# Phone foundations: build report (cycle 1, build run 2)

- **Built:** 2026-10-17 by the UI Engineer, from `spec.md` (approved at Checkpoint 2, 2026-10-17, with J1 in this build and J2 next cycle). Slices 0 to 8.
- **Code:** worktree `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/worktrees/agent-af4063da4b128f176`, branch `worktree-agent-af4063da4b128f176`, reset to `ce4fcb2` and holding run 1's changes plus run 2's. Nothing committed, pushed or deployed.
- **Run 1 in this worktree:** run 1's 21 modified files and 9 untracked files were copied from `agent-a851727193968606e` (the sandbox refused `git -C` against that worktree, so I copied the files instead of `git apply`; `diff -rq` against R1 then showed no differences outside `docs/`, `.omo` and `.superpowers`). R1 was not touched.
- **Runtime:** owned fictional runtimes on disposable Postgres clusters, started from scratch git copies of this worktree (`src-base` = run 1, `src-final` = run 1 + run 2; `src/app/app/schedule/coverage` force-added because `.gitignore` drops it). Jose's preview and the Postgres servers 18847 and 75730 were not touched.
- **Evidence:** `build-run-2/` next to this file (`before/`, `after/`, `day-picker/`, `root-200/`, `data/`).

## How the type change works (read this first)

The spec asks for phone type in rem with desktop type kept in px. About 1,950 of the phone-reaching px font declarations sit in rules that desktop also uses (`globals.css` alone has 740). Copying each into a phone override would double the rules and fight the cascade U10 warned about. Instead:

- A rule desktop shares now writes its size as `calc(n * var(--type-unit, 1px))`. `--type-unit` is set to `0.0625rem` only in the phone chrome query on `html body .app-shell.nevora-portal` (`portal-gusto.css`). Desktop gets `1px`, so desktop type stays px and does not follow the root. Phones get `n/16 rem`, which is exactly n px at the default 16px root. Selector weight and source order are unchanged, so the cascade can't move.
- A rule only phones match (`max-width` up to 767px, or the landscape phone branch) uses rem directly (`17px` became `1.0625rem`).
- px line-heights became rem the same way. Unitless and `em` values were left alone. Spacing, radii, borders, icons and the 44px targets stay px.
- The named tokens: `--mobile-body/caption/title/card-title` are rem in the phone query (as the spec's table). `--g-t-*` and `--portal-title/section` use the unit token in their base definition on `.app-shell`, which resolves to the spec's rem values in the phone chrome and to px on desktop. `--corporate-type-*`, `--corporate-line-*` and `--mh-*` are rem in their phone queries.
- Kept fixed by name: the wordmark lockup and `login-brand-module`, the company logo chip, avatars and initials, count badges, `kbd` hints, and the Branding page's phone and kiosk mock-up (`.bp-*`, an illustration of a phone). The Clocker kiosk and sign-in shells were not converted (separate PRDs).
- Tab labels: one rule, `font-size: min(0.75rem, 13px)`, the named exception to the 15px floor.

The conversion was mechanical (a PostCSS pass, run per slice, logged per declaration) and then proven by the computed-style snapshot, not by reading the code.

| Slice | Files | Declarations converted |
|---|---|---|
| 1 Shared chrome and legacy shared rules | 8 (`globals.css`, `typeface-theme.css`, `mobile-workforce.css`, `employee-mobile-corporate.css`, `portal-gusto.css`, `portal-design-system.css`, `portal-motion.css`, `portal-refinement.css`) | 740 shared, 88 phone-only |
| 2 Employee Home and My schedule | 4 | 61 shared, 8 phone |
| 3 Requests | 6 | 190 shared, 27 phone |
| 4 Time and pay, employee | 3 | 77 shared, 16 phone |
| 5 Manager Home and Inbox | 6 | 106 shared, 32 phone |
| 6 Manager Schedule | 6 | 208 shared, 24 phone |
| 7 Team and messages | 9 | 180 shared, 35 phone |
| 8 Payroll, exports, Insights, Settings | 19 | 392 shared, 62 phone |
| **Total** | **61** | **2,246** (1,954 shared, 292 phone-only); 37 kept fixed by name; 7 legacy tab-label rules left in place and outranked by the token |

Measured result: at a 200% root on 51 phone views, no visible text element outside the named exceptions keeps its px size (`data/px-bound-text-200pct.json`; the only hits are the Branding mock-up, which is fixed on purpose).

## Files changed

**Run 2 (this build):**

| File | Change |
|---|---|
| `src/app/app/portal-gusto.css` | `--type-unit` in the phone chrome query; unit token on `--g-t-*`, `--portal-title/section` and shared sizes; finder phone sizes to rem; the tab label token; the phone button shape block (shape, label, 48px lone primary, pairs wrap, 20px icons, 2px/2px focus ring, press scale); phone-search comment updated |
| `src/app/mobile-workforce.css` | `--mobile-*` tokens in rem; legacy primary and secondary pills now `var(--g-control-radius)`; phone fields `min-height: max(52px, calc(1.5em + 22px))` so a select grows with its text; phone day picker becomes the track (fill width, sideways scroll, edge fade, thin scrollbar, 8px segments, white chosen segment, 1px focus offset); old phone hover wash removed |
| `src/app/app/schedule/manager-schedule.css` | Day picker track, segments, divider, chosen ring, today dot, pointer-only hover, 150ms colour transition, increased contrast and forced colours; J1: grid disc removed, "Today" ink 600, today column tint `color-mix(in srgb, var(--g-inset) 60%, var(--g-canvas))`, location switcher chosen in ink 600; type to unit token |
| `src/app/app/portal-design-system.css` | Four-column picker grid at 600px removed (step B, see slice 0); type to unit token |
| `src/components/manager-weekly-roster.tsx` | Picker keeps the chosen day in view: on load sets the picker's `scrollLeft` (no page scroll); after a tap or key press `scrollIntoView({ inline: 'nearest', block: 'nearest' })`, smooth or instant under reduced motion; edge-fade attributes as the section tabs do |
| `src/components/timecards.tsx`, `src/components/timecards.module.css` | Manager Refresh: visible "Refresh" in the phone chrome, "Refresh timecards" on desktop, `aria-label="Refresh timecards"` at every width; toolbar collapses to one column below 7rem columns (large text); type to unit token |
| `src/components/timecards.batch.test.tsx` | The test's `click()` helper also finds a button by its accessible name (the label is now two spans) |
| `src/components/manager-home-gusto.css` | Today tiles: two per row, one per row once a tile would drop under 8rem (`repeat(auto-fit, minmax(max(8rem, calc(50% - 5px)), 1fr))`); type to unit token |
| `src/components/employee-directory.module.css` | Filter fields collapse to one column at large text; type to unit token |
| `src/components/payroll-export.module.css` | Employee rows and card heading reflow at large text; type to unit token |
| `src/app/app/availability/availability.css` | Review summary figures reflow at large text; type to unit token |
| `src/app/app/settings/locations/locations.css`, `settings/workspace/workspace-settings.css`, `requests/time-off.css`, `schedule/new/shift-workspace.css`, `employees/new/new-employee.css`, `src/components/reports.module.css` | Phone button pairs that sat in half-width grid cells become wrapping rows (step B); type to unit token |
| 46 further CSS files (`build-run-2/data/run2-changed-files.txt`) | Type to rem or unit token only |
| `scripts/dev/large-root-check.mjs` (new) | Slice 0 helper (check 0.3): loads each view at the default root and at a large root (`--mode css` stylesheet, or `--mode browser`, Chromium's real default font size), and reports sideways scroll, newly clipped text, content past the edge, new overlaps and small targets, focus hidden by sticky chrome, and tab label size and lines. Same dev-only guards as `style-snapshot.mjs` |
| `scripts/dev/style-snapshot.mjs` (run 1 file) | Screenshots hide the Next dev "Compiling…" badge (the one pixel noise the fixture clock did not explain) |

**Run 1 (unchanged by run 2 unless listed above):** `app-shell.tsx`, `command-finder.tsx`, `command-finder.test.ts`, `employee-home-*`, `manager-action-center.tsx`, `manager-dashboard.tsx`, `owner-setup-card*`, `sheet-gestures.tsx` (A2 fix not touched), `ui-preview/*`, `lib/action-center/setup.ts`, `lib/notifications/manifest*`, `fuel-portal.webmanifest/route.ts`, `phase-e-home-browser-scenarios.mjs`, the shortcut icons, `style-compare.mjs`. Run 2 also edited run 1's `portal-gusto.css`, `mobile-workforce.css`, `manager-home-gusto.css`, `manager-home-mobile.css` and `style-snapshot.mjs` as listed.

No server code, route, data contract or migration changed.

## Slice 0 notes (checks 0.4 and 0.5)

- **0.4 Offline "Try again":** 48px tall, 8px corners, 16px label at 390. `public/fuel-portal-offline.html` is not changed by this build. Pass.
- **0.5 Phone day picker cascade (320 and 390, before any change):** `display: flex` from `mobile-workforce.css:124` wins; the `portal-design-system.css:95-97` grid rule **does apply** at 320 and 390 (≤600px), but only its `grid-template-columns` survives, and that does nothing under flex. The rest of its declarations lose to `mobile-workforce.css` (heavier selector). Measured: 8px gap, padding 0 16px 16px, sideways scroll (scrollWidth 468 against 288 at 320 and 358 at 390); "Full week" 72 by 66px, days 44 by 66px, 8px padding; corners already 8px (portal-gusto sets `--mobile-control-radius: 8px` for the portal), so the spec's "14px to 8px" row computes to no change; weekday and date both 15px (spec row confirmed); chosen = Sat 17 (today, the phone default) with the `#E7F3F2` wash and teal `#077572` text.
- **Decision applied (spec 1.5):** the grid rule applies, so it was removed in step B as a listed change (its only computed effect is `grid-template-columns` going from `repeat(4, …)` to `none`).
- The spec's §1.5 "Phone sizes" row and the `portal-design-system.css` row should take these values; the spec lives in the main checkout, so I left that edit to the main session.

## Matches spec

| Spec | Item | Result |
|---|---|---|
| 1.1 | `rem = px/16` on phones, root untouched, line-heights rem, letter-spacing em, spacing/radii/icons/targets px | Pass |
| 1.1 | Desktop keeps px | Pass (unit token is 1px on desktop; 0 desktop differences in step A) |
| 1.1 | Phone tokens table | Pass (`--g-t-*` via the unit token rather than a second phone block; same computed values) |
| 1.1 | Tab label token `min(0.75rem, 13px)`; exception to the 15px floor | Pass. 12px at default, 13px on one line at 200% on all 51 views. It also moved employee Home, lead Home, the employee preview and owner `/app?view=*` from 10px to 12px (a legacy rule won there; the UX measurement of 12px was on the preview), listed as B1 |
| 1.2 | Header, tab bar, More sheets (48px rows), section tabs, finder sheet in rem; "Close actions" keeps its pill; header scrolls away on short screens | Pass |
| 1.3 | Phone buttons: 8px corners, 44px minimum, 48px lone full-width primary, 10px 16px padding, 17px/600/1.25, balanced, centred, 20px icons, pairs wrap | Pass with notes: "lone primary" is detected as a primary with no button beside it, so a short lone primary (Schedule "Add shift", Profile "Create link") is also 48px; 5 single buttons wrap at 320 because their label is wider than the 320 column (see B.2) |
| 1.3 | States: hover, pressed (scale .98, 120ms), focus 2px accent offset 2px, disabled .55, reduced motion colour only | Pass (focus offset 2px measured; reduced motion: no scale; the 120ms colour transition stays, which 1.9 allows) |
| 1.3 | Exceptions skipped by name | Pass (tab bar, section tabs, segmented tracks, chips, the pass link, "Close actions", swipe backdrops, Clocker untouched; the quiet corporate "Refresh" text button is a tertiary button and keeps its shape) |
| 1.4 | Timecards: fields and buttons side by side at 390 and 320; "Refresh" / "Refresh timecards" / name "Refresh timecards"; 200%: fields stack, buttons stack primary first, figures one per row | Pass (`build-run-2/root-200/root200-390-manager-_app_timecards.png`) |
| 1.5 | Track, segments, divider, unchosen, chosen ring, today dot, states, phone box kept, desktop sizes unchanged | Pass. One deviation: on phones the track fills the card width (`width: auto`) instead of `max-content`; `max-content` (and `fit-content`) widened the whole Schedule grid at 320 |
| 1.5 | Keep chosen day in view: `scrollLeft` on load, `scrollIntoView` after input | Pass (6.7) |
| 1.6 | J1: disc, "Today" label, column tint, phone location switcher | Pass (6.4) |
| 1.7 | Today tiles rem `minmax` | Pass, with 8rem instead of the spec's 9rem of content (9rem would put the tiles one per row at 320 at the default size) |
| 1.7 | Next-shift pass times nowrap; Employees, Inbox rows, Requests, section tabs at 200% | Pass except the gaps listed below |
| 1.8 | States at default and 200% | Partial: loading, error, offline, partial and permission states were not forced at 200% (gap) |
| 1.9 | Keyboard, scroll padding, screen-reader names, reduced motion, zoom | Pass for what was run (gaps: no screen reader; 81-view zoom run not repeated, 7 pages at 200% zoom and 400% reflow) |
| J2 | No change to other segmented controls | Pass (6.9) |
| Not built | J2, the sticky save bar, anything backend | Not built |

## Checks run

Before the first code change I took the baseline: the U10 plan (49 paths × 320, 375, 390, 1440, 1920 = 245 views) and a chrome plan (More sheets, finder at phone and desktop, account menu, manager Home, Timecards, Schedule with a day chosen, Inbox, lead Home, preview), 38 views, computed styles with geometry and masked screenshots.

| # | Check | Result |
|---|---|---|
| 0.1 | Snapshot script | Run 1's `scripts/dev/style-snapshot.mjs` + `style-compare.mjs` used; screenshot noise fix added |
| 0.2 | Baselines at 320, 375, 390, 1440 (and 1920); px inventory; button and P1 inventories at 390 (and 320) | Done (`data/inventory-buttons-p1-before.json`) |
| 0.3 | 200% root helper | `scripts/dev/large-root-check.mjs` |
| 0.4, 0.5 | Offline button; picker cascade | Pass; recorded above |
| A.1 | Step A at default size, 320/375/390 | **0 differences.** The first full run showed 29 views moving; every one traced to the fixture clock (the 8 AM–4 PM shifts ended at 4 PM between the two runs). Two paired re-runs of those 25 views, run 1 CSS then step A CSS minutes apart: 0 differences each. A paired full run (base then step A with the large-text fixes): 0 differences except the fixes I then reworked or reverted; a final paired run of those 7 pages: 0 differences |
| A.2 | Masked screenshots | 0 pixel differences beyond the fixture-clock pages and the Next "Compiling…" badge (now hidden by the tool) |
| A.3 | 1440 and 1920, every view | 0 differences in step A. In step B only Schedule and Schedule coverage change on desktop (the picker and J1) |
| A.4 | No px font-size on `html` or `:root` | 0 rules |
| A.5 | 200% root at 390, 51 views | **43 of 51 pass** in Chromium with the root set to 200%, and the same 43 with Chromium's real default font size set to 32px (`--mode browser`). WebKit: 42 of 51 (owner Availability passed on a recheck). No overlapping targets, no target under 44px and no focus stop hidden by the sticky chrome on any view. The 8 failures are listed under Known gaps |
| A.6 | Tab labels at the cap, one line; dense pieces wrap | Tabs 13px, one line, 51 of 51; Today tiles one per row; pass readable; Timecards stack; Employees filters stack |
| A.7 | Inputs at 16px or more | 186 fields on 51 phone views, 0 under 16px |
| B.1 | Step B diff equals the list | Pass. Paired full run (A then B): every non-geometry difference sorts into a listed change; the 4 leftovers are the employee Home countdown and greeting time (fixture clock). Geometry moves (x, y, width, height, resolved grid tracks) on phone views are counted as consequences of the listed button and picker changes (`data/stepB-classified-*.txt`) |
| B.2 | Phone button inventory, 320 and 390 | 236 primary and secondary buttons measured, **0** off 8px or under 44px. One-line labels everywhere they fit, except 5 single buttons at 320 whose label is wider than the 320 content column: "Name your first template", "Generate reviewed export", "Save normal availability", "Validate and import amounts", "Save company preferences" (no padding would fit them at 17px) |
| B.3 | Labels, names, actions, positions | Pass (manager Refresh visible text is the one listed change; DOM order kept, so a stacked pair keeps its order) |
| 4.1 | Timecards Refresh, both roles, 320/390/1440 | Pass |
| 6.1 to 6.8 | Picker and J1 at 320, 390, 1440 | Pass in Chromium (36 of 36) and WebKit (35 of 36; see the WebKit axe note) |
| 6.2 | Ring contrast | 5.64:1 on the track, 6.05:1 on white |
| 6.9 | Other segmented controls (J2 list) | 0 style or size differences on 380 elements across both plans; only position moves from content above |
| 8.1 | Payroll copy | No copy or markup changed on payroll pages (CSS only) |
| S.2 | Sweep and flows on a fresh runtime from `src-final` | `pages-test.mjs`: **156 ok**. U4 (first, fresh DB), U1, U2, U3, U6, U8: all ok. B3, B4: all ok. D1/D2 (d12), D3, D4, D5, D6: all ok. Run 1's `search-check` 90/0, `card-check` (read) 76/0, `polish-check` 49 pass / 10 fail (see gaps) |
| S.3 | Stress brand | Yellow stress brand (seed `#EAB308`, accent `#886600`): sweep **156 ok**; brand reset afterwards |
| — | Keyboard, 390: Schedule, manager Timecards, employee Timecards, Workspace (28–30 stops each) | Every stop has a 2px ring and none is hidden by the header or tab bar |
| — | 200% browser zoom (720 CSS px at 2x) and 400% reflow (320×256), 7 pages | No sideways scroll, nothing past the edge |
| — | Increased contrast, forced colours | Picker edge and ring turn ink; chosen segment gets a 2px solid outline in forced colours |
| — | `npx tsc --noEmit -p .` | Pass |
| — | eslint on changed TS and scripts | Pass |
| — | `npx vitest run --exclude '.claude/**' --exclude 'node_modules/**'` | 428 files, 7,221 tests passed, 0 failed |

## Screenshots

- **Before / after, same views and data:** `build-run-2/before/before-*.png`, `build-run-2/after/after-*.png` — Timecards (owner) and Schedule (manager), employee Home and owner Home at 320, 375, 390, 1440 and 1920; employee Timecards, New employee, Workspace, Locations, Insights, Time off at 320 and 390; Inbox at 390 and 1440; manager More sheet at 320 and 390; finder at 390.
- **Day picker:** `build-run-2/day-picker/` — track at 320, 390, 1440; Full week chosen; today chosen; forced colours at 390 and 1440; full Schedule at 320, 390, 1440.
- **200% root, 390:** `build-run-2/root-200/`.

## Known gaps

Things that need Jose are marked **(Jose)**.

**Large text (200% root) still fails on 8 of 51 phone views.** Each fix I tried here moved the default look, so I reverted it rather than ship an unlisted change:

| View | What happens at 200% | Why it isn't fixed in this build |
|---|---|---|
| Inbox (owner, manager) | 9px (WebKit) to 25px (Chromium) of sideways scroll | A visually hidden count label (`.sr-only`) in the Inbox filter buttons escapes the filters' scroll box once the labels grow. The fix (`position: relative` on the filter buttons) touches a J2 segmented control, so I left it for J2 **(Jose: fold into J2?)** |
| Availability (employee) | "Unavailable" past the card edge | The toggle column is a fixed 144px. Letting it grow moves every row 1.8px at the default size (the label already overflows by 1.8px today) |
| Settings › Features | Module rows wider than the card | The grid track and the row already overflow at the default size on some widths; containing them changes the default layout |
| Settings › Branding | Contrast table runs past the card | The result cells are `white-space: nowrap`; changing that is a listed-change decision |
| Payroll export | "Clear selection" clipped | Letting the selection bar wrap moves it at the default size |
| Settings › Positions, Settings › Break types | Filter segments clip at the card edge | Segmented controls; this build leaves them alone (J2) |

Also at 200%: Timecards rows break the name and "Recorded"/"Breaks" inside words (the columns are too narrow, and avoiding that changes the 320 default); Employees rows break the role and the phone number after hyphens (readable, not clipped); the swipe-row backdrop labels in Inbox are wider than the row while hidden (an exception, invisible until swiped).

**Other gaps**

- **Phone buttons at 320:** 5 single buttons wrap their label because it is wider than the 320 content column at 17px ("Name your first template", "Generate reviewed export", "Save normal availability", "Validate and import amounts", "Save company preferences").
- **Lone primary height:** a primary with no button beside it keeps 48px; that includes two short ones (Schedule "Add shift", Profile "Create link"). CSS can't tell a full-width primary from a short one **(Jose: accept, or list those two as 44px)**.
- **Tab labels:** the one token moved employee Home, lead Home, the employee preview and owner `/app?view=*` from 10px to 12px (B1). The spec assumed 12px everywhere **(Jose: confirm)**.
- **Approach:** shared rules use the `--type-unit` token instead of a second, phone-only copy of each rule. It keeps desktop in px and the cascade unchanged, and it means 1,954 declarations read `calc(n * var(--type-unit, 1px))` **(Jose: confirm this is acceptable as the house pattern)**.
- **Run 1's polish check:** 10 of 59 failed (B1.1, B1.2, B2.1, B1.x, B1.6 at 390 and 1440). They need a shift under way; the fixture shifts end at 4 PM and these ran after 6 PM, so the card showed the next-shift-only state. The unit tests for that card pass. Not a regression from this build, but not re-shown in a browser either.
- **WebKit axe on Schedule at 1440** after choosing a day: `target-size` on the team search field (WebKit's hit test returns the planning summary above it). The same finding appears on run 1's CSS, so it predates this build.
- **States at 200%:** loading, error, offline, partial and permission-denied states were not forced at a 200% root (S.1 partial). The offline page was only checked at default (0.4).
- **Zoom:** the 81-view 200% zoom run wasn't repeated; 7 pages were checked at 200% zoom and 400% reflow.
- **Not converted:** the publish-warning reason textarea sets `fontSize: 16` inline in TSX, so it stays px; the Clocker kiosk and sign-in shells (out of scope).
- **Picker on phones:** the track fills the card width instead of `width: max-content` (that widened the Schedule grid at 320).
- **Today tiles:** collapse at 8rem, not 9rem of content, to keep two tiles per row at 320.
- **Step B classification:** every non-geometry difference matched a listed change, but geometry moves (position, size, resolved grid tracks) on phone views are counted as consequences without being itemised.
- **Devices:** no iOS simulator, Android emulator or real device run this time; no screen reader. Most iPhone users won't see text grow until the store shell passes Dynamic Type to the root (spec 1.10); Firefox and Samsung Internet users with a larger default font size will.
- **Spec text:** the slice 0 values for spec §1.5 ("Phone sizes" and the `portal-design-system.css` row) are in this report; the spec file itself is in the main checkout, which I didn't edit.
- **Runtime records:** both of my runtimes stopped with `postgresStopped: true`. Their mirror verification reports a change, because I synced CSS into the dev mirror between snapshots (run 1 did the same) and Next rewrote the mirror's `next-env.d.ts`. The worktree's `next-env.d.ts` is unchanged.

## Shared with `claude/sleepy-easley-8955c8` (not merged)

That worktree (uncommitted, on `ce4fcb2`) changes the D4 segmented-control rules in `portal-desktop.css` (desktop only) and adds `--g-track-border: #E6E7E9` to the token block at the top of `portal-gusto.css`.

- `portal-gusto.css`: run 2 edits the `--g-t-*` lines a few lines below that token, so a text merge will need a look at that hunk.
- The day picker track uses `1px solid #E6E7E9`, the same value; after a merge it can read `var(--g-track-border)`.
- `.schedule-location-control .segmented > a.selected`: sleepy-easley keeps its desktop rule (`portal-desktop.css`); run 2 changed the base rule in `manager-schedule.css` to the same ink 600 for J1. Same outcome, different files.
- No other selector is shared. Run 2 did not touch `portal-desktop.css`.
