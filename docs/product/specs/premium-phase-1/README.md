# Premium direction, Phase 1: tokens, shared parts, corrected comps

October 18, 2026 · Worktree `.claude/worktrees/premium-phase-1`, branch `claude/premium-phase-1` from `8c4dd50`. Nothing committed or pushed.

## What's here

| File | What it is |
|---|---|
| `src/components/kit/kit.css` | The token sheet from `ui-designer.md`: one teal-tinted grey ramp, muted `#5F666A`, the four-step status ladder, 4px spacing, radii 20 / 12 / 8 / pill, three teal-tinted shadows, motion timings, and nine type roles in rem with a 15px phone floor. Brand colours read the company's `--g-*` keys first, so a company brand still applies. Every class is `nv-`; no existing page changes. |
| `src/components/kit/kit.tsx` | Shared parts: band (`Masthead`, white wordmark from the real asset, watermark from the NEVORA mark, Back that names its origin), `Card`, `Row` with a status slot under the meta, `Avatar`, `Tile`, `Status` (glyph plus word), `KitLink`, `Button` (blocked state shows its reason), `NextUp`, `StatGrid`, `Progress` (the words carry the value), `Money` and `Duration` (read in full by screen readers, never animated), `Freshness`, `FilterPills`, `ActionBar`, `Toast`. Presentation only: no fetching or mutation. |
| `src/components/kit/kit.test.tsx` | 16 tests: brand fallbacks, the 15px floor, the agreed radii, that kit CSS only styles `nv-` classes, reduced motion, and each part's markup and accessibility. |
| `/ui-preview/kit` | Fictional sample: Manager Home, a time-off review, and a parts sheet. Gated like `/ui-preview/home` (dev or `NEVORA_UI_PREVIEW_ENABLED=1`). Every link stays on the page. |
| Canvas | The 17 boards were moved onto the same tokens (version 25 of the design canvas). |

## Comp corrections (canvas)

- Text: everything at 15px or larger on phones (14px desktop), except tab labels (13px) and number badges (12px). Row titles are 17px and wrap to two lines, so long double surnames aren't cut off.
- Buttons use the action teal `#077572`. The header teal stays on the band only.
- One muted grey `#5F666A`, hairlines `#E8ECEB`, chevrons `#858B8F` (3:1).
- Card radius 20 (16 desktop), controls 12, pills fully round. Card padding 20, rows at least 64px.
- Eyebrows and group headings in sentence case, without tracking.
- "Her note" became "Note".
- Backup of the previous comps: `scratchpad/canvas/project-v23-backup`.

## Checks run

- **Browser** (Playwright, `/ui-preview/kit`, local dev server, fictional data): 19 of 19 passed ([evidence/checks.json](evidence/checks.json)).
  - No sideways scroll at 320, 390 or 1440.
  - No phone text under 15px.
  - Every link and button is at least 44px.
  - One h1 per screen.
  - axe (WCAG 2.2 AA) reports no violations at all three widths.
  - Focus ring: white on the band, action teal on cards.
  - The blocked button is grey and shows "Approve after Oct 18".
  - Reduced motion removes every transition.
- **Unit tests:** full suite 7,261 passed in 432 files (27 skipped), none failed. Copies in other `.claude/worktrees` were excluded. `tsc --noEmit` and eslint on the new files are clean.
- **Live pages:** `git status` shows only new files. No existing component, page or stylesheet changed.

The browser checks found two problems, which are fixed:
- `aria-label` on plain spans (axe `aria-prohibited-attr`). Figures now carry hidden full text instead.
- The 13px role label beside the wordmark is now 15px.

Review also found rows truncating names at 390. The status now sits under the meta line.

Screenshots: [kit-320](evidence/kit-320.png), [kit-390](evidence/kit-390.png), [kit-1440](evidence/kit-1440.png), [focus](evidence/focus-row-390.png), [Home comp](evidence/comp-Home-Owner-390.png), [Inbox comp](evidence/comp-Inbox-390.png), [Review comp](evidence/comp-Request-Review-390.png).

## Not covered, or left for Phase 2

- The tab bar with the sliding pill. It will be restyled in place in the app shell in Phase 2 rather than duplicated in the kit.
- F4 and F5 in the comps: verb pills ("Review", "Approve", "Set") still need to become links, "live" should become "Published", and "See who's missing" needs new wording. These belong to Phase 2 with the screen work.
- 200% zoom, large text on a real phone, VoiceOver, and dark mode.
- The comps are static HTML; their focus states aren't drawn.
