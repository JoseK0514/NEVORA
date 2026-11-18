# Band back-link row painted solid (Nov 16, 2026)

Codex's real-API QA on `9ba86c4d` reported axe `color-contrast` on the band back link at 768px (`#fdfefd` on `#f2f5f4`,
1.08:1). Investigation (`../2026-11-16-claude-rondo-weekly-ui.md`) showed a measurement gap shared by every pushed page:
from 768px the title paints the band as a `border-image` outset, and the back-link row above it declared no background.

## Change

`src/app/app/b-foundation.css`, inside `@layer nv-b`, `@media (min-width: 768px)`: the three back-link rows that sit above
a band title get `background-color: var(--b-band-solid)` (the established token, #0C726C):

- `.c-page:has(> header.c-title) > .c-nav--phone:has(> .c-nav__back)`, the corporate pages (weekly, knowledge, person, Help)
- `.q-page:has(> .q-hd) > .q-nav`, the Quiet pages (Company profile, Positions)
- `.q-page:has(> article > .q-hd) > .q-nav`, an update's own page

This is DESIGN.MD's existing band rule ("`--b-band-solid` is painted beneath wherever the band is a border-image, so
contrast tools read the real pair", Direction B foundation) applied to the one row it had missed. The band's first 236px
already are that colour, so nothing changes on screen. Layout, link size, hover, focus and phones are untouched. DESIGN.MD's
band bullet now names the row. No markup, data, handler or contract changed.

## Results (local fictional workspace; knowledge and weekly APIs mocked)

Six pages × 320, 390, 768, 1024, 1440 (`before/`, `after/`; `results.json` holds every raw axe violation per page).

| | Before | After |
|---|---|---|
| axe back link (768/1024/1440) | 18 failures, 1.08:1 (`.c-nav__back`, `.q-nav__l`) | none |
| axe `⌘K` hint in the top bar (1024/1440) | 12 failures, 3.55:1 | 12, unchanged (shared shell, not in this fix) |
| axe on phones (320/390) | none | none |
| Painted contrast, sampled from pixels | 4.71:1 (band rgb(12,114,108)) | 4.71:1, same pixels |
| Row background (768+) | transparent | rgb(12,114,108) |
| Back-link box, tab stop, focus ring | e.g. 290,88 117×32, Tab 17, 2px white @2px | identical on every page and width |
| Screenshots (`pixel-diff.txt`) | | 54 of 60 identical. 6 differ by 1–5 levels on 1–3 pixels: two in the top bar's search field, four at the focus ring's anti-aliased corner (they also differ on phones, where the rule doesn't apply) |

All raw failures are kept: `before/axe-raw-failures.txt` (30) and `after/axe-raw-failures.txt` (12, all the `⌘K` hint).

Scope sweep (`after/sweep-all-owner-routes.json`): 47 Owner routes at 768 and 1440. 58 rows matched the rule, across 25
routes, and every one sits above a title that paints the band, so the rule paints nothing outside it.

Checks: `tsc --noEmit` and `eslint src/app/app` clean. Full `vitest run`: 13,680 passed, 5 failed. The 4 that relate to
timing pass when rerun on their own; `manual-publication.test.ts` ("Stale or foreign application content hash") fails
identically at `2f9f03be` without this change (`tests-at-head.txt`, `tests-with-change.txt`).

Not covered: Codex's real authenticated Rondo flows, real APIs, other roles, Safari or Firefox. The `⌘K` hint (3.55:1) is a
separate shell decision. Local and unpushed; no shared push, merge or deploy.
