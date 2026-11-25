# Page text at 200%: DS-4 to DS-9 and DS-11 (Nov 23, 2026)

Branch `claude-codex-collab-nevora-ds-pages`, from `claude-codex-collab-nevora` at `c32ae519`. This covers the page rows
from the desktop 200% text sweep (`reports/sweep-desk200.md` on `claude-codex-collab-nevora-kit-final`).

Setup: production build (`NEVORA_OWNED_APP_PRODUCTION=1`) through the ui-scan harness, fictional data, Chromium.
- Owner (rich data) at 390, 1024 and 1440.
- Employee (rich data) at 390 and 1440.
- Each width was captured at the default size, then with the root text at 200%.

For the 200% pass, a probe recorded four things: text that didn't grow (under 1.6× its default size), text cut by its
box (with or without an ellipsis), text outside the viewport, and page overflow. It also recorded the CSS rule that set
each fixed size. The probe was added to a scratch copy of the harness only; `tools/ui-scan` is unchanged.

Before shots were taken from `c32ae519` in a separate worktree. After shots were taken from `8db67ea3`.

## Commits
| Commit | What |
|---|---|
| `845764c2` | Schedule, Build and publish, Time corrections, coverage card, Profile values: page text px → rem (same px at 16px) |
| `957b0845` | Schedule grid at large text; Swap and Call out meta line and Confirm; Profile "Edit"; phone subtitle; Settings and Team rows wrap at large text; tests |
| `8db67ea3` | Schedule: grid times wrap between start and end; the phone day card's count drops under its title; location menu in rem |
| `7822b328` | Test fix |

Checks before the push:
- `tsc --noEmit`: passes.
- `oxlint`: 0 errors. The warnings were there before this work.
- Whole `src/components` suite: 3240 passed, 0 failed.
- New tests in `src/app/app/ds-pages-text-rem.test.ts`, alongside `kit-text-rem.test.ts`: both pass.

## Per row
| Row | Page | Fixed px before | Now |
|---|---|---|---|
| DS-6 | Schedule | At desktop sizes: grid day head, date, hours, corner count, person names and hours, shift times and positions, "+ Add", location menu, week state ("Published"). At 390: the day card's "12 shifts · 61 h" | Everything listed is in rem. The page sheets `schedule-corp.css`, `owner-b-schedule.css` and `coverage-minutes.css` set no text in px. The week strip's day names are fixed by a Schedule-only override; the kit rule itself is unchanged (see Left) |
| DS-7 | Add shift, Build and publish | Page title (32px), Save shift and the publish buttons (the kit `.c-btn` 15px), week label | rem. `.c-btn` is set to 15/20px in rem inside `.c-shift-page`, `.c-pub` and `.c-sched`; `corp.css` is unchanged |
| DS-8 | Time corrections | Name, Recorded and Asked for times, the +35 min pill, "Their reason" and the quote. At 390, the band subtitle | `corrections.css` sets no text in px; the time-pay pill rule and the phone subtitle rule are rem |
| DS-9 | Swap, Call out | The card's wide meta line ("Mon, Nov 23", kit `.b-card__meta` 14px); Confirm (14px) | rem, through page rules in `employee-b/schedule.css` |
| DS-11 | Profile, device alerts, passkeys | "Edit" (15px on desktop, 14px from the shared phone band-action rule), row values at 390 (`.q-rv` 15px in the quiet bridge) | rem: `premium-profile.css` (avatar initials keep px), the quiet-bridge value rule, the phone band-action rule |
| DS-4, DS-5 | Settings, Team | Rows cut to one line with an ellipsis | Lead's decision: one line with an ellipsis at the default size, wrapping once text is enlarged (below) |

## How "wrap once text is enlarged" works (DS-4, DS-5, and the grid in DS-6)
`owner-b-pages.css` registers `--nv-rem` as a `<length>` and sets it to `1rem` on `body`. On the root element itself,
`1rem` would read the browser's initial size, so it goes on `body` instead. A registered length computes to pixels, so
it reads 16px at the default size.

`@container not style(--nv-rem: 16px)` then switches the Settings and Team row title and detail to wrap. Every element
is a style container, so no wrapper is needed.

At the default size the query doesn't match and nothing changes. It responds to both ways of enlarging text:
- the browser's text-size setting;
- a larger root size, which is how the harness sets 200%.

A browser without container style queries keeps the one-line look. Chrome, Edge and Safari 18 support them.

The Schedule grid uses the same switch: day columns get 6.5rem, the corner 10rem, and the grid scrolls sideways inside
its existing `.cm-grid__scroll` box, as a data table does. The page itself doesn't scroll sideways. Seven columns of
doubled shift times can't fit in 1080px any other way. Shift times wrap between start and end, positions wrap between
words, and person names wrap.

## 200% text after, at 390, 1024 and 1440
- Page overflow is 0 on every page.
- No text is clipped or overlaps: the probe found none, and every shot was checked by eye.
- On the Schedule grid, the probe flags only the columns the grid scrolls to (outside the viewport by design).

## Default size, before and after (pixel diff)
| Pages | Result |
|---|---|
| Profile, device alerts, passkeys, Add shift, Build and publish, Settings, Team, Time corrections at 390 | Identical |
| Settings and Team at 1024 and 1440; Time corrections, Profile pages, Add shift, Build and publish at 1440 (1024 before shots were taken for Schedule, Settings and Team only) | Only live data differs: the sidebar's Things to do count (14 → 15) and the bell's unread dot |
| Schedule at 390, 1024 and 1440; Swap and Call out | Only clock-driven fixture data differs (each checked by eye): shift times, "12 shifts" → "13 shifts", "4 open" → "5 open", "Staffing 57%" → "58%", "Schedule read at …" |

## Impeccable audit
- **Hierarchy:** unchanged at the default size. At 200% text the type ratios hold, because every size moved in step.
- **Spacing:** unchanged at the default size. At large text the grid's rows grow taller and its columns widen.
- **Accessibility:** WCAG 1.4.4 (resize text) now passes on these pages. WCAG 1.4.10 (reflow): the week grid scrolls sideways inside its own box, as allowed for data tables; the page doesn't.
- **States:** the Time corrections states (waiting, approved, rejected) and the Profile states (loaded, and on device alerts the "couldn't load your contact details" state that fixture data shows) were captured.
- **Wording:** unchanged.

## Left (kit or shared), proposed ledger rows
| Row | Where | What |
|---|---|---|
| DS-14 | Kit `owner-b.css` `.b-week__d` | The week strip's day names are 12px. They're fixed for Schedule only; Swap, Call out and Employee Schedule still show 12px. Proposed: `0.75rem` in the kit |
| DS-15 | Kit `owner-b.css` `.b-card__meta` | The card meta is 14px in the kit. It's fixed here only for Schedule and the Swap and Call out wide line. Proposed: `0.875rem` in the kit |
| DS-16 | Kit chip (`.b-row__t > .b-chip`) | "Action needed" is cut with an ellipsis at 390 with 200% text on Swap and Call out |
| DS-17 | Team filters (`.b-filters`, `--b-seg-fs` capped at 20px) | "Off today" runs under the right edge of the segmented control at 1024 with 200% text (it did before as well) |
| DS-18 | Shared card-aside link (`owner-b-desktop.css`, `.c-card__aside a` 14px !important) | Team's "See all" stays 14px |
| DS-19 | Build and publish at 390 | "Availability" (`.c-row__value`) stays 15px: the shared phone row-value rule is still px |
| DS-20 | `employee-b/schedule.css` line 80 | Another 14/20px button on the Employee schedule (not Swap or Call out); not in scope here |

## Follow-up: DS-14 to DS-20 (lead, Nov 23)
The lead asked me to fix these rows too. I merged the shared tip first (`49487fc5`) and changed only the selectors below.

| Commit | What |
|---|---|
| `20cae7ba` | Kit and shared changes (rows below). The Schedule-only and Swap/Call out overrides from the first round are removed, because the kit rules now cover them |
| `9ef77134` | `corp-upscale.test.tsx` now expects the row value as 0.9375rem/1.25rem (still 15/20px) |

| Row | Change | At 200% text |
|---|---|---|
| DS-14 | Kit `.b-week__d`: 12px → 0.75rem | The day names grow on Schedule, Swap, Call out and Employee Schedule |
| DS-15 | Kit `.b-card__meta` was already 0.875rem on the shared tip (kit session); my page overrides are removed | No change needed |
| DS-16 | Kit `.b-row__t > .b-chip`: once text is enlarged (`--nv-rem` query), the chip wraps with an auto height | "Action needed" is no longer cut. It stays one line at the default size |
| DS-17 | `owner-b-home.css`: once text is enlarged, Team's filters use the phone's wrapping pills (G24) on tablets and desktop | "Off today" moves to a second row inside the control; one row at the default size |
| DS-18 | `owner-b-desktop.css` card-aside link: 14px → 0.875rem | "See all" grows |
| DS-19 | Kit `corp.css` `.c-row__value`: 15/20px → 0.9375rem/1.25rem | "Availability" grows at 390 |
| DS-20 | Not changed: the kit session has the Employee Schedule "Confirm" button in flight | — |

**Before and after:**
- **Default size:** Owner and Employee at 390, 1024 and 1440, production build. The before shots are from `49487fc5`, the after shots from `20cae7ba`. The pages were Home, Schedule, Build and publish, Team, Settings, Swap, Call out and the Requests hub. Team, Home (Owner), Build and publish at 390 and 1024, Settings at 390 and the Requests hub are pixel-identical. The rest differ only in live data: the bell's dot, "Schedule read at", and the Employee shift times that follow the clock.
- **200% text:** page overflow is 0 everywhere. The probe no longer finds the DS-14, 16, 17, 18 and 19 items.
- **What the probe still reports belongs to other rows:** Home's live figures and "Prepare" button and the Requests hub's figures (DS-12 and DS-13, Home), the Home timeline labels, and the filters' 20px cap (by design).

**Checks before the push:** tsc passes; oxlint has 0 errors; the whole `src/components` suite has 3245 passed and 0 failed; and `ds-pages-text-rem.test.ts` plus `kit-text-rem.test.ts` pass.

New shots are in `shots/ds-pages/img/k-*`, with rows DS-14, DS-16, DS-17/18 and DS-19 in `rows.json`.

## Follow-up: 44px targets for the first release (lead, Nov 23)
I merged the shared tip first (`4a629582`). Code: `dd3c6d56`.

Each control's tap area was measured in a production build at 390, 768, 1024 and 1440: from the control's centre, how
far a tap still lands on it (`elementFromPoint`, a tap on its label counts). Before was measured on `4a629582`, after on
`dd3c6d56`.

| Target | Before | Change | After |
|---|---|---|---|
| Timecards week control ("This week", "Last week", "Earlier") | 36px tall from 768px | On desktop, the band's tab rules hid the tabs' `::after`. It's now a transparent ring reaching the track's 4px padding above and below (36 + 8 = 44). Covers `nav.c-pay-tabs`, `nav.c-seg` and `.c-tc-seg` in the band (`owner-b-desktop.css`) | 44px tall |
| Payroll tabs | 36px tall from 768px | Same rule | 44px tall |
| Form-head back link ("‹ Team") | 32px tall from 768px | Transparent `::after`, 44px tall and centred, for every pointer type. Touch screens already had one (`owner-b-shell.css`) | 44px tall |
| "What this measures", the icon-only button at 390 | 36×36 | The ring was already meant to be 44px (`inset: -4px`), but the kit's `.b-btn::after` translate (-50%) moved it half above the button. It's now centred, and that works whether or not the build keeps a `translate: none` override | 44×44 |
| "What this measures", the labelled button | 36px tall, 44px ring | Same fix | 44px tall |
| Timecards review checkboxes (Select, desktop table) | 32×44: the label was the cell's 48px minus its 16px padding | `.c-tc-desk .c-tc-hit` is 44px wide, extending 12px into the cell's left padding, so the box doesn't move (`timecards-corp.css`) | ≥44×44 at 768, 1024 and 1440 |

- **Phones:** the review checkbox sits inside its row's `<label>`, so the whole row is the tap area. This was already true and is covered by a test.
- **Default look:** nothing drawn changed; the rings are transparent pseudo-elements.
- **Default-size pixel diff:** 390 is identical for Add person, Payroll and Timecards last week. Every other difference is clock-driven fixture data: hours, counts, the bell, Insights figures, and the before run's "Last week", whose rows hadn't loaded yet. Each one was checked by eye.
- **Checks:** tsc passes; oxlint has 0 errors; the whole `src/components` suite has 3257 passed and 0 failed; `target-size-44-desk.test.ts` (new), `target-size-44.test.ts` and `ds-pages-text-rem.test.ts` pass.
- **Shots:** `shots/ds-pages/img/t44-*` (before and after).

Found but not in this round's list: the Payroll history link, the Schedule grid's open-shift chips and the empty
cell's "+ Add". The lead then asked for all three; see the next section.

## Follow-up: the three extra targets (lead, Nov 23)
I merged the shared tip first (`a8694e7d`). Code: `880af013`.

Measured the same way, as the reach from the centre, on a production build at 390, 768, 1024 and 1440. Before is
`dd3c6d56` plus the merged tip; after is `880af013`.

| Target | Before | Change | After |
|---|---|---|---|
| "Payroll history" (Payroll, header of the Recent payrolls card) | 41px tall from 768px: the first payroll row below overlapped the link's lowest 3px | The link is `position: relative; z-index: 1` (`payroll-corp.css`), so all 44px of it is its own | 44px. The row stays over 44px tall |
| Schedule grid open-shift chips ("4 open") | 36px tall from 768px | A transparent `::after` reaches 44px tall, centred, inside the chip's own cell (`owner-b-schedule.css`, from 768px) | 44px |
| Schedule grid empty cell "+ Add" | 24px tall from 768px | The same rule | 44px |

- **No overlap:** each ring keeps its target's width (`left: 0; right: 0`) and stays inside the target's own cell.
- **Spacing:** the grid rows are tall enough for a full 44px ring, so the 24px spacing fallback of WCAG 2.5.8 wasn't needed. Every probed control on Schedule and Payroll now reaches 44px at all four widths.
- **No translate:** the ring's top and bottom are `min(0px, 50% - 22px)`, because the production build had dropped a `translate` override before.
- **Default look:** nothing drawn changes. At 390, 768, 1024 and 1440 the default-size pixel diff against the build without the fix differs only in the live "Schedule read at" time.
- **Checks:** tsc passes; oxlint has 0 errors; the `src/components` and `src/app` suites have 4928 passed and 0 failed; `target-size-44-desk.test.ts` is extended with both rules.
- **Shots:** `shots/ds-pages/img/t44b-*` (before and after).
