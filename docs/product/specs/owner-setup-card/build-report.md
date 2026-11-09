# Owner setup card: build report (cycle 1, build run 1)

- **Built:** 2026-10-17 by the UI Engineer, from `spec.md` (approved at Checkpoint 2, 2026-10-17): J1, J2 and J3's wording. **Not built:** J4 (sticky save bar) and the "No target" choice (needs a backend go-ahead). The weekly deadline stays a Task. Owners only.
- **Code:** worktree `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/worktrees/agent-a851727193968606e`, branch `worktree-agent-a851727193968606e`, based on `ce4fcb2`. Nothing committed.
- **Evidence folder:** `docs/product/specs/owner-setup-card/build-run-1/` in the main checkout.

## Files changed

| File | Change |
|---|---|
| `src/lib/action-center/setup.ts` (new) | `SETUP_TYPES`, `setupSteps()` (coverage open, count of people with no target), `hasSetupGaps()`, `setupDoneCount()`, `withoutSetupItems()` (filters the two types and recomputes every count) |
| `src/components/manager-action-center.tsx` | `HomeActionCenterProvider`: one `useActionCenter()` read on Home, shared by Tasks and the card; keeps the last confirmed steps (only a ready read changes them; first state from the server's `managerActions`). `ManagerActionCenter` uses the shared read when present and filters setup items while the card shows. `ActionCenterSurface` takes `setupListed`: counts come from the list it's given; an empty list says "Setup steps are listed above." (list and phone summary) instead of "No tasks found in the checked sources."; "Open inbox" stays while the Inbox still holds items |
| `src/components/owner-setup-card.tsx` (new) | `OwnerSetupCard` (presentational) and `OwnerSetupCardLive`: `section` labelled by the `h2`, count line, `aria-hidden` bar, two steps; links with `aria-describedby` reasons; caret kept with the last word; J2 "Add a location" when there are no locations; B2 nouns as two whole strings |
| `src/components/manager-dashboard.tsx` | Wraps live Home in the provider (not the preview); renders the card first in `.home-layout` for Owners; new `setup` preview slot |
| `src/components/manager-home-gusto.css` | `.home-progress > span` reads `var(--home-progress-fill, var(--g-accent))`; `.manager-portal-home` sets it to `--color-state-success` (#1D6F42, J1). Card styles for desktop (bordered, 260px left block, two step columns), 761 to 899px (stacked), phone (first white surface, 12px above the tiles); grid areas with a `setup` row only when the card is present (including the D3 empty-live variant); reduced motion, increased contrast, forced colours |
| `src/components/ui-preview/home-fixtures.ts` | Preview data: coverage periods not configured, three people with no target (AUDIT-LEAD, AUDIT-LONG, payroll-qa-b) |
| `src/components/ui-preview/home-preview.tsx` | Owner preview shows the card and filtered Tasks; Manager keeps every item |
| `src/components/owner-setup-card.test.tsx` (new), `src/components/ui-preview/home-preview-shell.test.tsx` (new), `src/components/ui-preview/home-preview.test.tsx` | Unit tests below; preview counts 10 → 14 and the manager-action-center mock gains the provider |

No server, route, data contract or migration changed. `src/app/app/schedule/settings/page.tsx` is untouched.

## Matches spec

| Spec | Item | Result |
|---|---|---|
| 1.1 | One shared read; filtered Tasks; first paint from server props; grid `setup` area; `--home-progress-fill` | Pass |
| 1.2 | Owner only; hidden on a failed server read; shows with gaps; gone on a ready read with none; keeps the last confirmed steps while loading, offline or unavailable; returns when a gap comes back | Pass (server-read-failed by code path only, see gaps) |
| 1.3 | Desktop card above the Today strip, 20px gap, 12px radius, border, two-column layout, copy sizes; This week bars green | Pass. The card measures about 128px tall with two open steps (spec "about 112") because the coverage reason wraps to two lines at 1440 |
| 1.4 | Phone: first white surface straddling the masthead, tiles 12px below, 15px muted heading, 20px count, 17px links at least 44px | Pass |
| 1.5 | Open step: muted `Circle`, link title, reason by `aria-describedby`. Done step: green `CheckCircle`, plain name, "Done" in #1D6F42, no link | Pass |
| 1.6 | Copy exactly as the table (not the mock-up); B2 nouns; two whole strings; caret is an icon | Pass |
| 1.7 | `#coverage-staffing`, `#target-hours`, `/app/settings/locations` with zero locations | Pass |
| 1.8 | Tasks filtered and every count recomputed; deadline and availability stay with "Setup needed"; filtered-empty second line; truly empty source unchanged; Inbox unchanged | Pass |
| 1.9 | States: two gaps, one gap, first paint, live failure, only-setup Tasks, zero locations, done, other roles, preview | Pass (zero locations in unit tests only, see gaps) |
| 1.10 | Keyboard order, screen-reader structure, no motion, 200% zoom, increased contrast, forced colours, B1 brand | Pass (contrast modes written, not rendered) |
| J1 | Both Home bars ladder green | Pass |
| J2 | "Add a location ›" with zero locations | Pass in unit tests |
| J3 | "{n} {people} have no weekly hour target." / "1 {person} has no weekly hour target." | Pass |
| J4 | No save bar or prompt added | Pass (not built; settings page unchanged) |

## Checks run

| # | Check | Result |
|---|---|---|
| 1.1 | No filter applied: Manager Home (shared read, no card, no filter) against the pre-change snapshot at 320, 390, 1440 and 1920: the only differences are the two This week bars (J1) and, on phones, the header search button | Pass. I built the slices together, so there is no separate slice-1-only snapshot; this is the equivalent evidence |
| 1.2, 1.2a | Unit tests: counts from the filtered list; only-setup source renders "You’re all caught up" and "Setup steps are listed above." and not "No tasks found in the checked sources"; the D7 test unchanged | Pass |
| 1.2b | `.home-progress > span` reads the token | Pass (source) |
| 1.3 | Action-center requests per refresh: 1 completed request on Home, the same as the untouched Inbox. The dev server's StrictMode mounts effects twice, so the first request is aborted in development | Pass |
| 1.4 | 156-check sweep and U4 Inbox checks | Pass (run twice, the second after the last code change) |
| 2.1 | Owner, gaps present: "Finish setting up" above the Today strip at 320, 390, 1440, 1920 | Pass, Chromium and WebKit |
| 2.2 | Two steps, coverage then hours | Pass |
| 2.3 | Count matches the bar share (0/50/100%); bar `aria-hidden` | Pass |
| 2.4 | Copy exact; caret; B2 noun; no "missing" | Pass |
| 2.5 | Done step: green check, "Done" #1D6F42, no link | Pass |
| 2.6 | Manager (390, 1440), employee, lead: no card; manager Tasks keep the setup items | Pass |
| 2.7 | Hours link lands on `#target-hours` with that section focused; coverage link to `#coverage-staffing` (unit + href check) | Pass at 390 and 1440 |
| 2.8 | On real data: blanking one target reopens the step ("0 of 2 done", "1 employee has no weekly hour target."); fixing it on the settings page and returning by the Home tab shows "Done" and "1 of 2 done" with no page reload | Pass. Adding a fictional location ("Fictional East Office") also brought the coverage step back (regression case) |
| 2.9 | Tasks leave out both types; deadline and availability stay with "Setup needed"; Inbox still lists the setup items | Pass |
| 2.9a | Only setup items in the source at 320, 390, 1440: "You’re all caught up" + "Setup steps are listed above." in the list and the phone summary; "No tasks found" nowhere in the page source. A truly empty source keeps "No tasks found in the checked sources." | Pass |
| 2.10 | Card in the server HTML; with the live read held, the card is on screen and the Today strip doesn't move when the read lands | Pass at 320, 390, 1440, 1920 |
| 2.11 | A ready read that differs (both gaps) updates the card to "0 of 2 done" | Pass |
| 2.12 | Failed live read (500) and offline: card keeps "1 of 2 done"; Tasks show "Tasks unavailable" | Pass |
| 2.13 | Server read failed: no card | Code path only: the page returns "Dashboard unavailable" before rendering the dashboard. Not forced in a browser |
| 2.14 | Ready read with zero gaps: card gone, no celebration | Pass |
| 2.15 | axe on Home at 390 and 1440 | 0 violations, both engines |
| 2.15 | Keyboard: card link before the Today tiles, 2px ring | Pass in Chromium (WebKit doesn't Tab to links by default) |
| 2.15 | 720 CSS px and 320 at 2x: no sideways scroll | Pass |
| 2.16 | Reduced motion: no card animation, link transition 0s, bar never animates | Pass |
| 2.17 | Default and Ocean brand: links in the brand action colour, done mark and bar green | Pass |
| 2.18 | 390: first setup link on the first screen, above the Today strip; one tap to the section | Pass |
| 2.19 | Screenshots | Done (list below) |
| 2.20 | Card bar and This week bars compute to rgb(29, 111, 66) on Owner and Manager Home at 390 and 1440; snapshot diff shows these as the only bar changes | Pass |
| 2.21 | Zero locations | Unit test only (see gaps) |
| 2.22 | `/app/schedule/settings` against the pre-change snapshot: 0 differences at 1440; at 390 only the header search button | Pass |
| 3.1 | Preview Owner: card with coverage not configured and "3 employees have no weekly hour target."; bars green | Pass |
| 3.2 | Preview Manager: no card; setup items in Tasks | Pass |
| 3.3 | `home-preview.test.tsx` counts updated in the same change | Pass |
| 3.4 | Preview screenshots at 390 and 1440, Owner and Manager | Done |
| — | tsc, eslint, vitest | Pass (vitest final: 7,221 passed, 0 failed) |

## Screenshots (main checkout, `build-run-1/`)

- **Before:** `before-owner-home-{320,390,1440,1920}.png`, `before-manager-home-{390,1440}.png`, `before-preview-{owner,manager}-{390,1440}.png`.
- **After, one gap:** `after-owner-home-{320,390,1440,1920}.png`, `after-card-one-gap-{320,390,1440,1920}.png`, `after-card-one-gap-390-webkit.png`.
- **After, states:** `after-card-two-gaps-{320,390,1440}.png`, `after-card-failed-read-{390,1440}.png`, `after-card-zero-gaps-390.png`, `after-card-only-setup-{320,390,1440}.png`, `after-card-zoom-{720,320}.png`, `after-card-landing-target-hours-{390,1440}.png`, `after-ocean-brand-390.png`.
- **After, real data change:** `after-mutate-1-start.png`, `after-mutate-2-two-gaps.png`, `after-mutate-3-after-fix.png`.
- **After, other roles and preview:** `after-manager-home-{390,1440}.png`, `after-card-manager-{390,1440}.png`, `after-preview-{owner,manager}-{390,1440}.png`.

## Known gaps

- **Zero-locations state (2.21) and server-read-failed (2.13)** weren't shown in a browser: the fixture workspace has two locations and a failed server read can't be forced without breaking the database. Both are covered by unit tests or the code path.
- **Increased contrast and forced colours** are written, not rendered.
- **Card height** is about 128px on desktop with two open steps, against the spec's "about 112px", because the coverage reason wraps.
- **`claude/sleepy-easley-8955c8` (not merged):** that worktree adds a `segmented-control` class on the Tasks category filter row in `manager-action-center.tsx` (line 80). My edits in that file are on other lines (the surface signature, the empty lines, the footer, and the provider at the end), so a merge should be clean but touches the same file.
